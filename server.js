var express = require('express');
var queryString = require('querystring');
var request = require('request');
var bodyParser = require('body-parser');
var logger = require('./configs/logger');
var paypal = require('paypal-rest-sdk');

var app = express();
app.use(bodyParser.urlencoded({	extended: false }))
var serverHost = process.env.SERVER_HOST

// Get API credentials
app.get('/', function(req, res){
	res.send(
	"<h2>PayPal SandBox Payment Generator</h2><form action='/create-payment'>API Key:<br><input type='text' name='APIKey' value=''><br>API Secret:<br><input type='text' name='APISecret' value=''><br><br><input type='submit' value='Submit'></form>"
); })

// Create payment
app.get('/create-payment', function(req, res){
	var apiKey = req.query.APIKey;
	var apiSecret = req.query.APISecret;
	createPayment(apiKey, apiSecret, function(payment){
		//redirect to our approval handler to execute payment
		res.redirect(payment.links[1].href)
		console.log("User redirected to PayPal for approval")
	});
})

// Execute Payment
app.get('/approved', function(req, res){
	var payerId = req.query.PayerID;
	var paymentId = req.query.paymentId;
	console.log("User has approved the payment");
	executePayment(payerId, paymentId, function(payment){
		//console.log(payment)
		res.send("Payment completed succesfully! <a href='/'> Create another payment </a>");
	})

})


function createPayment(apiKey, apiSecret, callback){
	if(apiKey && apiSecret){
		paypal.configure({
			'mode': 'sandbox', //sandbox or live
			'client_id': apiKey,
			'client_secret': apiSecret,
			'headers' : {
			'custom': 'header'
			}
		});

		var create_payment_json = {
			"intent": "sale",
			"payer": {
					"payment_method": "paypal"
			},
			"redirect_urls": {
					"return_url": "https://" + serverHost + "/approved",
					"cancel_url": "https://" + serverHost + "/"
			},
			"transactions": [{
					"item_list": {
							"items": [{
									"name": "item",
									"sku": "item",
									"price": "1.00",
									"currency": "USD",
									"quantity": 1
							}]
					},
					"amount": {
							"currency": "USD",
							"total": "1.00"
					},
					"description": "This is the payment description."
			}]
		};

	 paypal.payment.create(create_payment_json, function (error, payment) {
	 		if (error) {
	 				console.log(error)
					callback(error)
	 				//throw error;
	 		} else {
	 				console.log("Payment Created");
					callback(payment)

	 		}
	 });
 }
}


function executePayment(payerId, paymentId, callback){
		var execute_payment_json = {
				"payer_id": payerId,
				"transactions": [{
						"amount": {
								"currency": "USD",
								"total": "1.00"
						}
				}]
		};
		paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
				if (error) {
						console.log(error.response);
						//throw error;
				} else {
						console.log("Payment Executed");
						callback(payment);
				}
		});
}


var port = null;
if(process.env.PORT){ port = process.env.PORT; }else{ port = 3000; } // Default port is 8888 unless passed
app.listen(port);
var msg = 'Server listening at http://localhost:' + port;
console.log(msg);
