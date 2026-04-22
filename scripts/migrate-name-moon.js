require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function migrate() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Connected to database");

  try {
    const result = await mongoose
      .connection
      .collection("gallery")
      .updateMany({ name: { $exists: false } }, { $set: { name: "moon" } });

    console.log(`Migration complete: ${result.modifiedCount} documents updated → name="moon"`);
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
