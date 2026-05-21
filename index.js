const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

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



const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async(req, res, next) =>{
  const authHeader = req?.headers.authorization;
  if(!authHeader){
     res.status(401).json({message: "Unauthorized"});
  }
// console.log(authHeader)
  const token = authHeader.split(" ")[1];
  if(!token){
     res.status(401).json({message: "Unauthorized"})
  }
  // console.log(token)
  try{
    const {payload} = await jwtVerify(token, JWKS)
    
    next();
  }catch (error){
    return res.status(403).json({message: "Forbidden"})
  }
}



async function run() {
  try {
    // await client.connect();

    const db = client.db("boighor");
    const libraryRoomsCollection = db.collection("libraryRooms");

    const bookingRoomsCollection = db.collection("bookingRooms");



    app.post("/rooms", verifyToken, async (req, res) => {
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

    app.post("/booking-rooms", verifyToken, async (req, res) => {
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



    // app.get("/all-rooms", async (req, res) => {
    //   const result = await libraryRoomsCollection.find().toArray();

    //   res.json(result);
    // });


    app.get("/all-rooms", async (req, res) => {
  try {
    const {
      search,
      sort,
      amenities,
      floors,
      minPrice,
      maxPrice,
    } = req.query;

    let query = {};

    
    if (search) {
      query.roomName = {
        $regex: search,
        $options: "i",
      };
    }

    
    if (amenities) {
      const amenitiesArray = amenities.split(",");

      query.amenities = {
        $all: amenitiesArray,
      };
    }

    
    if (floors) {
      const floorsArray = floors.split(",");

      query.floor = {
        $in: floorsArray,
      };
    }

    
    if (minPrice || maxPrice) {
      query.hourlyRate = {};

      if (minPrice) {
        query.hourlyRate.$gte = Number(minPrice);
      }

      if (maxPrice) {
        query.hourlyRate.$lte = Number(maxPrice);
      }
    }

    
    let sortOption = {};

    if (sort === "low") {
      sortOption.hourlyRate = 1;
    }

    if (sort === "high") {
      sortOption.hourlyRate = -1;
    }

    const result = await libraryRoomsCollection
      .find(query)
      .sort(sortOption)
      .toArray();

    res.json(result);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});



    app.get("/home-rooms", async (req, res) => {
      const result = await libraryRoomsCollection.find().limit(6).toArray();

      res.json(result);
    });

    app.get("/all-rooms/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await libraryRoomsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });


    app.get('/my-bookings/user/:userId', verifyToken, async(req, res )=> {
      const {userId} = req.params
      const result = await bookingRoomsCollection.find({userId : userId}).toArray();
      res.json(result);
    })

    app.get('/my-listings/user/:userId', verifyToken, async(req, res)=>{
      const {userId} = req.params;
      const result = await libraryRoomsCollection.find({user : userId}).toArray();
      res.json(result);
    })


    app.patch("/bookings/:id", async (req, res) => {
      const { id } = req.params;
      const updatedBooking = req.body;

      console.log(updatedBooking);

      const result = await bookingRoomsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedBooking },
      );

      res.json(result);
    });


    app.patch('/rooms/:id', verifyToken, async(req, res)=>{
      const {id} =req.params;
      const updatedRoom = req.body;


      const result= await libraryRoomsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedRoom },

      )

      res.json(result);
    })


    app.delete("/my-booking/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await bookingRoomsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });



    app.delete("/rooms/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await libraryRoomsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    // await client.db("admin").command({ ping: 1 });
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
