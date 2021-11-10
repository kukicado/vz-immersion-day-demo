# vz-immersion-day-demo

The VZ Immersion Day Demo showcases an application built for

To get started run `npm install`. While the dependencies are installed, rename
the `.env.example` file to `.env` and replace the stubbed out variables with
your data. You will need your MongoDB Connection String, a Database Name, and a
Collection name to store the data. Once you have populated these fields and npm
install has installed all of it's dependencies, run `node index.js` to start
your application.

## Training the Data Model

To train the data model, open up the `athletes.json` file. In this file you will
see a list of JSON documents containing athlete information. Feel free to add
additional athletes as you see fit.

To train the data model, run `node addFaceDescriptors.js`. This script will add
FaceAPI face descriptors to all the athletes and will generate a new file called
`athletes-withDescriptors.json`. If you open that file, you will see that each
athlete now has an additional `descriptors` array containing their face
information.

## Saving the Athlete Information to MongoDB

To upload the athlete data and face descriptions, execute `node uploadToMDB.js`.
This will add all of the athletes and their accompanying face data into your
MongoDB database, whether it's hosted on MongoDB Atlas or elsewhere.

## Testing the Application

Once you have your athlete information loaded into a MongoDB database, you're
ready to test the application. To start up the app, run `node index.js`.

Navigate to `localhost:3000` in your browser. You will be presented with a UI to
add an athlete. Upload a picture and watch the magic happen.

## Note: If you want to use TensforFlow GPU

Leveraging a compatible GPU will make the face detection work much faster. To
enable Tensorflow GPU, simply uncomment line 9 in `index.js`. Additionally, in
your `node_modules` folder, you will need to navigate to the `face-api.js`
directory and delete its `node_modules` folder. Once you do this, restart the
app and you should be able to leverage your GPU for face detection.
