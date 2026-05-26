const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/run-automation", (req, res) => {

    const automationFile = path.join(
        __dirname,
        "automation.js"
    );

    exec(
        `node "${automationFile}"`,
        (error, stdout, stderr) => {

            console.log("stdout:", stdout);
            console.log("stderr:", stderr);

            if (error) {
                console.log(error);

                return res.json({
                    success: false,
                    message: error.message
                });
            }

            if (stderr) {
                return res.json({
                    success: false,
                    message: stderr
                });
            }

            res.json({
                success: true,
                output: stdout
            });

        }
    );
});

app.listen(port, () => {
    console.log(
        `Server is running on port ${port}`
    );
});