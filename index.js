const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require('dotenv').config();
const express = require('express')

const { MongoClient, ServerApiVersion } = require('mongodb');


const uri = process.env.MONGODB_URL

const app = express()
const port = process.env.PORT

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();


    const db =client.db("boighor");
    const libraryRoomsCollection = db.collection("libraryRooms")

    


    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
