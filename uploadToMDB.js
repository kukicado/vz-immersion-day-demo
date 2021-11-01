import fs from "fs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const SOURCE_FILE = "athletes-withDescriptors.json";

// Abstract This Out
const mongoClient = await MongoClient.connect(`${process.env.MONGODB_URI}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function main() {
  const data = JSON.parse(fs.readFileSync(SOURCE_FILE).toString());

  try {
    await mongoClient
      .db(process.env.MONGODB_DB)
      .collection(process.env.MONGODB_COLLECTION)
      .drop();
  } catch (e) {
    console.log(e);
  }

  try {
    const res = await mongoClient
      .db(process.env.MONGODB_DB)
      .collection(process.env.MONGODB_COLLECTION)
      .insertMany(data);

    console.log("Done! Inserted the following records:");
    console.log(res);
    process.exit();
  } catch (e) {
    console.log(e);
  }
}

main();
