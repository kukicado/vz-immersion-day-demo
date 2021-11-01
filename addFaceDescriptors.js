import fs from "fs";
import faceapi from "face-api.js";
import nodeCanvas from "canvas";
import util from "util";
import stream from "stream";
import { dirname } from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_PATH = `${__dirname}/models`;
const SOURCE_FILE = "athletes.json";
const EVENT_ID = "Tokyo2020";

const peopleData = JSON.parse(fs.readFileSync(SOURCE_FILE).toString());

await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);

const { Canvas, Image, ImageData } = nodeCanvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const downloadImage = async (uri, filename) => {
  const streamPipeline = util.promisify(stream.pipeline);
  const response = await fetch(uri);
  if (response.ok) {
    return streamPipeline(response.body, fs.createWriteStream(filename));
  }

  if (response.status === 404) {
    console.log(`Got a 404 for ${filename}`);
    return fs.copyFileSync(`${__dirname}/assets/default_profile.png`, filename);
  }

  throw new Error(
    `Unexpected response ${response.status} ${response.statusText}`
  );
};

const getDescriptors = async (filename) => {
  let faceDescriptors = {};
  try {
    const input = await nodeCanvas.loadImage(filename);
    const fullFaceDescription = await faceapi
      .detectSingleFace(input)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!fullFaceDescription) {
      console.log(`No faces detected for ${filename}`);
      return;
    }

    faceDescriptors = Array.from(fullFaceDescription.descriptor);
  } catch (e) {
    console.log(e);
  }

  return faceDescriptors;
};

async function main() {
  let newPeopleData = peopleData.map(async (personData) => {
    let uri = personData.imgSrc;
    let filename = uri.split("/");
    filename = filename[filename.length - 1];
    let fileExtension = filename.substr(filename.lastIndexOf(".") + 1);
    if (filename === fileExtension) {
      fileExtension = "jpg";
      filename = `${filename}.${fileExtension}`;
    }
    filename = `${__dirname}/tmp/${filename}`;
    await downloadImage(uri, filename);

    let descriptors = await getDescriptors(filename);
    personData.descriptors = descriptors;
    personData.eventId = EVENT_ID;
    try {
      await fs.unlinkSync(filename);
    } catch (e) {
      console.log(e);
    }
    return personData;
  });

  Promise.all(newPeopleData).then((d) => {
    console.log(newPeopleData);
    fs.writeFileSync(
      SOURCE_FILE.replace(".json", "-withDescriptors.json"),
      JSON.stringify(d)
    );
  });
}

main();
