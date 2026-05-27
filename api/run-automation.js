const { exec } = require("child_process");
const path = require("path");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed"
    });
  }

  const automationFile = path.join(__dirname, "..", "server", "automation.js");

  exec(`node "${automationFile}"`, (error, stdout, stderr) => {
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);

    if (error) {
      console.log(error);

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    if (stderr) {
      return res.status(500).json({
        success: false,
        message: stderr
      });
    }

    return res.status(200).json({
      success: true,
      output: stdout
    });
  });
};
