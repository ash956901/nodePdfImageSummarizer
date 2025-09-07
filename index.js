const express=require('express');
//Instantiating express app 
const app=express();
//importing/injecting env
require("dotenv").config();
const PORT=process.env.PORT || 4000;

//using json middleware to parse http payloads
app.use(express.json());

//basic get route to test server 
app.get("/",(req,res)=>{
    res.send("<h1>Welcome to the task</h1>");
})

//listening on the port defined on the env or 4000 
app.listen(PORT,()=>{
    console.log("namaste bolta server");
})

