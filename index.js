const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require('dotenv').config();
const express = require('express')
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = process.env.MONGODB_URL

const app = express()
const PORT = process.env.PORT

app.use(cors());
app.use(express.json());


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

    app.post('/rooms', async(req, res )=> {
        const roomsData = req.body
        console.log(roomsData);

        const result = await libraryRoomsCollection.insertOne(roomsData);
        res.json(result);
    })



    app.get('/all-rooms', async(req, res) =>{
        const result = await libraryRoomsCollection.find().toArray();
        
        res.json(result);
    })

    app.get('/all-rooms/:id', async(req, res) =>{
      const {id} = req.params;

      const result = await libraryRoomsCollection.findOne({_id : new ObjectId(id)});

      res.json(result);
    })


    app.patch('/rooms/:id', async(req, res ) =>{
       const {id} = req.params
       const updateData = req.body

       console.log(updateData)

       const result = await libraryRoomsCollection.updateOne({_id : new ObjectId(id)}, {$set: updateData})

       res.json(result)

    })


    
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

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
