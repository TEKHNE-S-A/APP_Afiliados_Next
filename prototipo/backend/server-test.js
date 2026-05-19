const express = require('express');
const app = express();
app.get('/ping',(req,res)=>res.json({pong:true, ts: Date.now()}));
app.listen(3100,'0.0.0.0',()=>{
  console.log('TEST server listening on 3100');
});
setInterval(()=>{}, 60000);
