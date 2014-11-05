var express = require('express');
var bodyParser = require('body-parser');
var parseString = require('xml2js').parseString;
var request = require('request');
var twilio = require('twilio');
var Firebase = require('firebase');

var numbers = [];

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var subscribersRef = new Firebase(process.env.FIREBASE_URL);
subscribersRef.on('child_added', function(snapshot) {
     numbers.push( snapshot.val() );
     console.log( 'Added number ' + snapshot.val() );
     });

app.post('/relay', function(req, res){
	
     var client = new twilio.RestClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);   

     req.body.items.forEach(function(item) {

          var item = req.body.items[i];

          parseString(item.summary, function (err, result) {

               if (!err) {
                    var title = result.img.$.title;
                    var src = result.img.$.src;

                    for(var j=0;j < numbers.length; j++) {
                         client.sendMessage({
                              to: numbers[j], 
                              from: process.env.TWILIO_PHONE_NUMBER, 
                              body: item.title + ':\r\n' + title + '\r\n' + item.permalinkUrl, 
                              mediaUrl: src
                              }, function( err, message ) {
                                   console.log( message.sid );
                         });
                    }
               } else {
                    console.log(err);
               }
          });
     });
     res.status(200).send();  
});

app.post("/process", function(req, res) {

     var body = req.body.Body.trim().toLowerCase();

     var twiml = new twilio.TwimlResponse();
     res.type('text/xml');

     if ( parseInt(body) ) {
          request('http://xkcd.com/' + body + '/info.0.json', function (error, response, json) {

               if (!error && response.statusCode == 200) {
                    var result = JSON.parse(json);
                    twiml.message(function() {
                         this.media(result.img).body(result.safe_title + '\r\n' + result.alt + '\r\nhttp://xkcd.com/' + body);
                    });
               } else {
                    twiml.message('Could not find an XKCD with that number');                                           
               }
               res.end(twiml.toString());
          });

     } else if(body  === 'subscribe' ) {
          var fromNum = req.body.From;
          if(numbers.indexOf(fromNum) !== -1) {
               twiml.message('You already subscribed!');
          } else {
               twiml.message('Thank you, you are now subscribed. Reply "STOP" to stop receiving updates.');
               subscribersRef.push(fromNum);
          }
          res.end(twiml.toString());
     } else {
          twiml.message('Welcome to XKCD SMS. Text "Subscribe" receive updates.');
          res.end(twiml.toString());
     }
});

var server = app.listen(process.env.PORT || 3000, function() {
     console.log('Server started!');
}); 