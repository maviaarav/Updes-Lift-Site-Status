const { chromium: playwrightChromium } = require("playwright");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");

const isVercel = Boolean(process.env.VERCEL);
const maxLoginAttempts = isVercel ? 8 : 1000;
const captchaWaitTimeout = isVercel ? 3000 : 5000;
const postClickDelayMs = isVercel ? 500 : 1500;
const dashboardTimeout = isVercel ? 6000 : 10000;
const finalPageTimeout = isVercel ? 6000 : 10000;

let serverlessChromium = null;

try {
    serverlessChromium = require("@sparticuz/chromium");
}
catch {
    serverlessChromium = null;
}

const getBrowserLaunchOptions = async () => {
    if (process.env.VERCEL && serverlessChromium) {
        return {
            args: serverlessChromium.args,
            defaultViewport: serverlessChromium.defaultViewport,
            executablePath: await serverlessChromium.executablePath(),
            headless: serverlessChromium.headless
        };
    }

    const headlessMode = process.env.HEADLESS !== "false";
    return {
        headless: headlessMode,
        args: headlessMode ? [] : ["--disable-gpu", "--disable-dev-shm-usage"]
    };
};

const buildStatusOutput = (status) => {
    return [
        `{`,
        `  "login": ${status.login},`,
        `  "pageAppears": ${status.pageAppears},`,
        `  "buttonClicked": ${status.buttonClicked},`,
        `  "finalStage": ${status.finalStage},`,
        `  "output": "${status.output}"`,
        `}`
    ].join("\n");
};

const finalizeStatus = (status, success) => {
    return {
        ...status,
        success,
        output: buildStatusOutput(status)
    };
};

const readCaptchaText = async (captchaImage) => {
    const result = await Tesseract.recognize(
        captchaImage,
        "eng",
        {
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        }
    );

    return result.data.text
        .trim()
        .replace(/\s/g, "")
        .replace(/[^a-zA-Z0-9]/g, "");
};

const checkWebsite = async (
    type,
    mob,
    password
) => {

    let browser;
    let page;

    const status = {
        login: false,
        pageAppears: false,
        buttonClicked: false,
        finalStage: false,
        success: false,
        output: ""
    };

    try {

        browser =
            await playwrightChromium.launch(
                await getBrowserLaunchOptions()
            );

        page =
            await browser.newPage();

        await page.goto(
            "https://updeslift.org/Account/login",
            {
                waitUntil:
                "domcontentloaded"
            }
        );

        await page.waitForSelector(
            "#Type"
        );

        let loginSuccess =
            false;

        for(
            let attempt = 1;
        attempt <= maxLoginAttempts;
            attempt++
        ){

            // refill fields every attempt
            await page.selectOption(
                "#Type",
                {
                    value: type
                }
            );

            await page.fill(
                "#Mob",
                mob
            );

            await page.fill(
                "#Password",
                password
            );

            // wait for captcha
            await page.waitForSelector(
                '//*[@id="loginform"]/div[5]',
                {
                    timeout: captchaWaitTimeout
                }
            );

            const captchaImage =
                await page
                .locator(
                    '//*[@id="loginform"]/div[5]'
                )
                .screenshot();

            const captchaText =
                await readCaptchaText(captchaImage);


            // skip bad OCR
          

            await page
                .locator(
                    "#Captcha"
                )
                .clear();

            await page.fill(
                "#Captcha",
                captchaText
            );

            await page.click(
                '//*[@id="loginform"]/div[7]/button'
            );

            await page
            .waitForLoadState(
                "networkidle"
            )
            .catch(()=>{});

            await page
            .waitForTimeout(
                postClickDelayMs
            );

            const errorSpan =
                page.locator(
                    '//*[@id="loginform"]/span'
                );

            const exists =
                await errorSpan
                .isVisible()
                .catch(
                    ()=>false
                );

            if(exists){

                const spanText =
                    await errorSpan
                    .textContent();

                if(
                    spanText &&
                    spanText.includes(
                        "Invalid Captcha"
                    )
                ){


                    await page
                    .locator(
                        "#Captcha"
                    )
                    .clear();

                    continue;
                }

            }

            console.log(
                "Captcha accepted"
            );

            loginSuccess =
                true;

            status.login =
                true;

            break;

        }

        if(
            !loginSuccess
        ){

            status.output =
            "Maximum retries reached";

            return finalizeStatus(status, false);

        }


        // Dashboard appears check

        try{

            await page
            .waitForSelector(
                ".nano-content",
                {
                    timeout: dashboardTimeout
                }
            );

            status.pageAppears =
                true;


        }
        catch{

            status.pageAppears =
                false;

            status.output =
                "Dashboard did not appear";

            return finalizeStatus(status, false);

        }


        // Button click check

        try{

            await page
            .locator(
                '//*[@id="menu"]/ul/li[2]/a'
            )
            .click();

            await page
            .locator(
                '//*[@id="menu"]/ul/li[2]/ul/li[1]/a'
            )
            .click();

            status.buttonClicked =
                true;


        }
        catch{

            status.buttonClicked =
                false;

            status.output =
                "Button click failed";

            return finalizeStatus(status, false);

        }


        // Final page check

        try{

            await page
            .waitForSelector(
                ".table-responsive",
                {
                    timeout: finalPageTimeout
                }
            );

            status.finalStage =
                true;

            status.output =
                "Website working correctly";

            return finalizeStatus(status, true);

        }
        catch{

            status.finalStage =
                false;

            status.output =
                "Login page is working but final page did not load";

            return finalizeStatus(status, false);

        }

    }
    catch(error){

        status.output =
            error.message;

        return finalizeStatus(status, false);
    }
    finally{


        if(
            browser
        ){

            await browser
            .close();

        }

    }

};

module.exports = {
    checkWebsite
};