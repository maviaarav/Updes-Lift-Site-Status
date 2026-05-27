const { checkWebsite } = require("../server/automation");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed"
    });
  }

  const result = await checkWebsite(
    "Public",
    "9870692681",
    "StrongPassword@234"
  );

  return res.status(200).json(result);
};
