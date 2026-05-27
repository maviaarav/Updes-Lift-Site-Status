const express = require("express");
const cors = require("cors");
const { checkWebsite } = require("./automation");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/run-automation", (req, res) => {
    checkWebsite(
        "Public",
        "9870692681",
        "StrongPassword@234"
    ).then((result) => {
        res.json(result);
    }).catch((error) => {
        res.status(500).json({
            success: false,
            message: error.message
        });
    });
});

app.listen(port, () => {
    console.log(
        `Server is running on port ${port}`
    );
});