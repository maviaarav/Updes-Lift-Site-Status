const { chromium: playwrightChromium } = require("playwright");
const Tesseract = require("tesseract.js");

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

    return {
        headless: true
    };
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
            attempt <= 30;
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
                    timeout:5000
                }
            );

            const captchaImage =
                await page
                .locator(
                    '//*[@id="loginform"]/div[5]'
                )
                .screenshot();

            const result =
                await Tesseract
                .recognize(
                    captchaImage,
                    "eng"
                );

            const captchaText =
                result.data.text
                .trim()
                .replace(
                    /\s/g,
                    ""
                )
                .replace(
                    /[^a-zA-Z0-9]/g,
                    ""
                );


            // skip bad OCR
            if(
                captchaText.length < 4
            ){

                console.log(
                    "Bad OCR result"
                );

                continue;
            }

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
                1500
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

            return status;

        }


        // Dashboard appears check

        try{

            await page
            .waitForSelector(
                ".nano-content",
                {
                    timeout:10000
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

            return status;

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

            return status;

        }


        // Final page check

        try{

            await page
            .waitForSelector(
                ".table-responsive",
                {
                    timeout:10000
                }
            );

            status.finalStage =
                true;

            status.output =
                "Website working correctly";

        }
        catch{

            status.finalStage =
                false;

            status.output =
                "Login page is working but final page did not load";

        }

        return status;

    }
    catch(error){

        status.output =
            error.message;

        return status;
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