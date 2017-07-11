//dependencies
const colors = require("colors/safe");
const mysql = require("mysql");
const request = require("request-promise");
const hat = require("hat");

//TWILIO stuff
const accountSid = 'AC7b77e08a33aadf7cad22329888e8a381';
const authToken = '7e9a098a2c077de2e70aa1b5f8fee758';
const phoneNumber = '+13123456230';
//
const twilio = require('twilio')(accountSid, authToken);



function REST_ROUTER(router,connection) {
    var self = this;
    self.handleRoutes(router,connection);
}

REST_ROUTER.prototype.handleRoutes= function(router,connection) {

    router.get("/",function(req,res){
        res.json({"ping" : "pong"});
        // Basic get request. Nothing special.
        // Can be used to poll connection to server.
    });

    router.post("/spots/single/",function(req,res){
        var query = 'SELECT * FROM spots WHERE spot_id = ' + req.body.spot_id;
        // Select the entire JSON object corresponding to a spot_id
        connection.query(query,function(err,rows){
          if(err) {
              console.log('spot_id as sent:' + req.body.spot_id);
              console.log(colors.red('query failed...'));
              console.log(colors.red(query));
              res.json({"message" : "operation failed"});
          } else {
              console.log('spot_id as sent:' + req.body.spot_id);
	            console.log(colors.green(query));
              res.json(rows[0]);
          }
      });
  });

    router.post("/spots/onscreen/",function(req,res){
        var query = `SELECT * FROM spots WHERE ((lat <= ${req.body.upper_lat}) AND (lat >= ${req.body.lower_lat})) AND ((lon <= ${req.body.upper_lon}) AND (lon >= ${req.body.lower_lon}))`;
        // Select the entire JSON object for every spot within specific lat/lon bounds
        connection.query(query,function(err,rows){
          if(err) {
              console.log('lower LAT bound as sent:' + req.body.lower_lat);
              console.log('lower LON bound as sent:' + req.body.lower_lon);
              console.log('upper LAT bound as sent:' + req.body.upper_lat);
              console.log('upper LON bound as sent:' + req.body.upper_lon);
              console.log(colors.red('query failed...'));
              console.log(colors.red(query));
              res.json({"message" : "operation failed"});
          } else {
              console.log('lower LAT bound as sent:' + req.body.lower_lat);
              console.log('lower LON bound as sent:' + req.body.lower_lon);
              console.log('upper LAT bound as sent:' + req.body.upper_lat);
              console.log('upper LON bound as sent:' + req.body.upper_lon);
              console.log(colors.green(query));
              res.json(rows);
          }
      });
  });

    router.post("/spots/status/",function(req,res){
        var query = `UPDATE spots SET status = '${req.body.status}' WHERE spot_id = '${req.body.spot_id}'`;
      // Updates the status of a spot with a given status (T = TAKEN; F = FREE) at a certain spot_id
        connection.query(query,function(err,rows){
          if(err) {
              console.log('spot_id as sent:' + req.body.spot_id);
              console.log('status as sent:' + req.body.status);
              console.log(colors.red('query failed...'));
              console.log(colors.red(query));
              res.json({"message" : "operation failed"});
          } else {
              console.log('spot_id as sent:' + req.body.spot_id);
              console.log('status as sent:' + req.body.status);
              console.log('status spot #' + req.body.spot_id + 'was changed to ' + req.body.status);
              console.log(colors.green(query));
              res.json({"status" : req.body.status});
          }
    });
});
    router.post("/spots/closest/",function(req,res){
        var query = `SELECT open_spots.spot_id, open_spots.lat, open_spots.lon
FROM spots AS open_spots WHERE open_spots.status = 'F'
ORDER BY (POWER((open_spots.lon - ${req.body.lon}), 2.0) + POWER((open_spots.lat - ${req.body.lat}), 2.0))
LIMIT 1`
    // Returns a single JSON object with the closest lat/lon to the destination.
        connection.query(query,function(err,rows){
            if(err) {
                console.log(`dest. lat as sent: ${req.body.lat}\ndest. lon as sent: ${req.body.lon}`);
                console.log(colors.red('operation failed...'));
                res.json({"error" : "operation failed"});
              } else {
                var token = 'pk.eyJ1IjoicGFyY2FyZSIsImEiOiJjajN2cjU4MGkwMGE1MnFvN3cxOWY5azFlIn0.qmmgzy-RijWWqV-ZbmiZbg';
                options = {
                  uri: `https://api.mapbox.com/directions/v5/mapbox/driving/${req.body.lon},${req.body.lat};${rows[0].lon},${rows[0].lat}?access_token=${token}`,
                  method: "GET"
                };
                request(options)
                // send a GET request to the Mapbox API
                .then (function(response){
                  var json = JSON.parse(response);
                  // parse the response into JSON
                  var route = json.routes[0];
                    console.log(`distance: ${route.distance} meters`);
                    res.json({"spot_id" : rows[0].spot_id, "lat" : rows[0].lat, "lon" : rows[0].lon, "distance" : route.distance});
                })
                .catch(function (err) {
                console.log(colors.red("error with Mapbox request."))
              })
          }
      });
  });


  router.post("/users/profile/update/",function(req,res){
      var query = `UPDATE users SET name = '${req.body.name}', home_address = '${req.body.home_address}', work_address = '${req.body.work_address}', work_loc_id = '${req.body.work_loc_id}', home_loc_id = '${req.body.home_loc_id}'
    WHERE user_id = '${req.body.user_id}' AND access_token = '${req.body.access_token}' AND phone = '${req.body.phone}';`;
      // Updates a user's personal/profile information.
      connection.query(query,function(err,rows){
        if(err) {
            console.log(colors.red(`updating ${req.body.user_id}'s profile failed...`));
            res.json({"resp_code" : "6"});
        } else {
            console.log(colors.green(`${req.body.user_id}'s profile updated!`));
            res.json({"resp_code" : "100"});
        }
  });
});

  router.post("/users/profile/get/",function(req,res){
    var query = `SELECT home_loc_id, home_address, work_loc_id, work_address, name, user_id, access_token FROM users WHERE user_id = '${req.body.user_id}' AND access_token = '${req.body.access_token}' AND phone = '${req.body.phone}';`;
    // Fetches user's entire profile (apart from a few irrelevant things)
    connection.query(query,function(err,rows){
      if(err) {
          res.json({"resp_code" : "7"});
      } else {
          if (Object.keys(rows[0]).length === 0 && rows[0].constructor === Object){
            res.json({"resp_code" : "7"});
          }
          else{
            res.json(rows[0]);
          }

      }
});
});



router.post("/users/auth/pin/",function(req,res){
    var randomPin = Math.floor(1000 + Math.random() * 9000);
    var query = `SELECT EXISTS(SELECT pin FROM users WHERE phone = '${req.body.phone}') as existsRecord`;
    connection.query(query,function(err,rows){
      if(err) {
          console.log(err);
          console.log(colors.red(`response code: 1`));
          res.json({"resp_code" : "1"});
      } else {
            console.log(rows[0].existsRecord);
            if (rows[0].existsRecord == 1) {
              var date = Math.floor((new Date).getTime() / 1000);
              console.log(date);
              var queryUpdate = `UPDATE users SET pin = ${randomPin}, pin_timestamp = ${date} WHERE phone = '${req.body.phone}';`;
              connection.query(queryUpdate, function(err, rows){
                if (err) {
                  //throw err;
                  res.json({"resp_code" : "1"});
                }
                else {
                      sendText(req.body.phone, randomPin);
                      console.log(colors.green(`sending phone/pin to verify...`));
                      res.json({"resp_code" : "100"});
                    }
                  });
                }
            else if (rows[0].existsRecord == 0) {
              var date = Math.floor((new Date).getTime() / 1000);
              var query = `INSERT INTO users (pin, phone, pin_timestamp) VALUES (${randomPin}, '${req.body.phone}', ${date});`;
              connection.query(query, function(err, rows){
                if (err) {
                  //throw err;
                  res.json({"resp_code" : "1"});
                }
                else{
                      sendText(req.body.phone, randomPin);
                      console.log(colors.green(`sending phone/pin to verify...`));
                      res.json({"resp_code" : "100"});
                      //connection.release();
                  }
                });
              }
          }
    });
});

router.post("/users/auth/verify/",function(req,res){
    // RECIEVE: PHONE/PIN
    // SEND: access_token, user_id, response code/error code
    var query = `SELECT pin, pin_timestamp FROM users WHERE phone = '${req.body.phone}';`;
    //SELECT pin, pin_timestamp WHERE phone = '${req.body.phone}' as pinAndTime;
    connection.query(query,function(err,rows){
      if(err) {
          console.log(err);
          console.log(colors.red(`response code: 1`));
          res.json({"resp_code" : "1"});
      } else {
            var date = Math.floor((new Date).getTime() / 1000);
            if (date - rows[0].pin_timestamp < 120) {
              if (rows[0].pin != req.body.pin){
                res.json({"resp_code" : "2"});
              }
              else if (rows[0].pin == req.body.pin){
                var token = hat();
                var date = Math.floor((new Date).getTime() / 1000);
                var query = `UPDATE users SET access_token = '${token}', token_timestamp = ${date} WHERE phone = '${req.body.phone}' AND pin = ${req.body.pin};
SELECT name, user_id, access_token FROM users WHERE phone = '${req.body.phone}' AND pin = ${req.body.pin};`;
                connection.query(query, function(err, rows){
                  if (err){
                    throw err;
                    res.json({"resp_code" : "1"});
                  }
                  else {
                    if (rows[1][0].name == null){
                      res.json({access_token : `${rows[1][0].access_token}`, user_id : `${rows[1][0].user_id}`, resp_code : "101"});
                    }
                    else {
                      res.json({access_token : `${rows[1][0].access_token}`, user_id : `${rows[1][0].user_id}`, resp_code : "102"});
                    }
                  }
                });
              }
            }
            else if (date - rows[0].pin_timestamp >= 120){
                res.json({"resp_code" : "3"});
            }
          }
    });
});

router.post("/users/auth/reauth/",function(req,res){
//     // RECIEVE: PHONE, USER_ID, access_token
//     // SEND: response code (4: expired, 3: invalid, 101: success)
var query = `SELECT EXISTS(SELECT * FROM users WHERE phone = '${req.body.phone}' AND user_id = ${req.body.user_id} AND access_token = '${req.body.access_token}') as existsRecord;`;
connection.query(query,function(err,rows){
  if(err) {
      console.log(err);
      console.log(colors.red(`response code: 1`));
      res.json({"resp_code" : "1"});
  } else {
        if (rows[0].existsRecord == 1) {
          var date = Math.floor((new Date).getTime() / 1000);
          var query = `SELECT token_timestamp, name FROM users WHERE phone = '${req.body.phone}' AND user_id = ${req.body.user_id} AND access_token = '${req.body.access_token}';`;
          connection.query(query, function(err, rows){
            if (err) {
              res.json({"resp_code" : "1"});
            }
            else {
              if (date - rows[0].token_timestamp <= 7776000){
                if (rows[0].name == null){
                  res.json({"resp_code" : "101"});
                }
                else{
                  res.json({"resp_code" : "102"});
                }
              }
              else{
                res.json({"resp_code" : "4"});
              }
            }
          });
        }
        else if (rows[0].existsRecord == 0) {
              res.json({"resp_code" : "5"})
          }
      }
    });
});
}
//

function sendText(phone, pin){
  twilio.messages
      .create({
        to: phone,
        from: phoneNumber,
        body: `aspace pin: ${pin}`
      })
       .then((message) => console.log(message.sid));
}

module.exports = REST_ROUTER;
