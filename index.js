const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URL;

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("boighor");
    const libraryRoomsCollection = db.collection("libraryRooms");

    const bookingRoomsCollection = db.collection("bookingRooms");

    app.post("/rooms", async (req, res) => {
      const roomsData = req.body;
      console.log(roomsData);

      const result = await libraryRoomsCollection.insertOne(roomsData);
      res.json(result);
    });

    // app.post('/booking-rooms', async(req, res)=>{
    //   const bookingData= req.body

    //   const result = await bookingRoomsCollection.insertOne(bookingData)

    //   res.json(result)
    // })

    app.post("/booking-rooms", async (req, res) => {
      try {
        const bookingData = req.body;

        const { roomDetails, departureDate, startTime, endTime } = bookingData;

        // same room + same date check
        const existingBookings = await bookingRoomsCollection
          .find({
            roomDetails,
            departureDate,
          })
          .toArray();

        // convert hour
        const newStart = Number(startTime.split(":")[0]);
        const newEnd = Number(endTime.split(":")[0]);

        // overlap check
        const isConflict = existingBookings.some((booking) => {
          const existingStart = Number(booking.startTime.split(":")[0]);
          const existingEnd = Number(booking.endTime.split(":")[0]);

          return newStart < existingEnd && newEnd > existingStart;
        });

        if (isConflict) {
          return res.status(400).json({
            success: false,
            message: "This room is already booked for this time.",
          });
        }

        const result = await bookingRoomsCollection.insertOne(bookingData);

        res.json({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.log(error);

        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    app.get("/all-rooms", async (req, res) => {
      const result = await libraryRoomsCollection.find().toArray();

      res.json(result);
    });

    app.get("/all-rooms/:id", async (req, res) => {
      const { id } = req.params;

      const result = await libraryRoomsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });


    


    app.patch("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;

      console.log(updateData);

      const result = await libraryRoomsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );

      res.json(result);
    });

    app.delete("/rooms/:id", async (req, res) => {
      const { id } = req.params;

      const result = await libraryRoomsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
