var express = require('express');
var queryString = require('querystring');
var request = require('request');
var bodyParser = require('body-parser');
var logger = require('./configs/logger');
var paypal = require('paypal-rest-sdk');
var url = require('url');

var app = express();
app.use(bodyParser.urlencoded({	extended: false }))
var serverHost = process.env.SERVER_HOST





// Get API credentials
app.get('/', function(req, res){
	res.send(
	"<h2>PayPal SandBox Payment Generator</h2><br><h4>Create Payment</h4><form action='/create-payment'>API Key:<br><input type='text' name='APIKey' value=''><br>API Secret:<br><input type='text' name='APISecret' value=''><br><br><input type='submit' value='Submit'></form> \
</hr><h4>Create Billing Agreement</h4><form action='/create-agreement'>API Key:<br><input type='text' name='APIKey' value=''><br>API Secret:<br><input type='text' name='APISecret' value=''><br><br><input type='submit' value='Submit'></form>"
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

// Create payment
app.get('/create-agreement', function(req, res){
	var apiKey = req.query.APIKey;
	var apiSecret = req.query.APISecret;
	createBillingPlan(apiKey, apiSecret, function(billingAgreement){
		//redirect to our approval handler to execute payment
		for (var index = 0; index < billingAgreement.links.length; index++) {
				if (billingAgreement.links[index].rel === 'approval_url') {
						var approval_url = billingAgreement.links[index].href;
						console.log("For approving subscription via Paypal, first redirect user to");
						console.log(approval_url);
						res.redirect(approval_url);

						console.log("Payment token is");
						console.log(url.parse(approval_url, true).query.token);
						// See billing_agreements/execute.js to see example for executing agreement
						// after you have payment token

				}
		}

	});
})

// Execute Payment
app.get('/payment-approved', function(req, res){
	var payerId = req.query.PayerID;
	var paymentId = req.query.paymentId;
	console.log("User has approved the payment");
	executePayment(payerId, paymentId, function(payment){
		//console.log(payment)
		res.send("Payment completed succesfully! <a href='/'> Create another payment </a>");
	})
})

// Execute Agreement
app.get('/agreement-approved', function(req, res){
	var paymentToken = req.query.token

	paypal.billingAgreement.execute(paymentToken, {}, function (error, billingAgreement) {
	    if (error) {
	        console.log(error);
	        throw error;
	    } else {
	        console.log("Billing Agreement has been executed");
	        console.log(JSON.stringify(billingAgreement));
					res.send("Agreement approved");
	    }
	});


})

function createPayment(apiKey, apiSecret, callback){
	if(apiKey && apiSecret){

		//configure paypal
		paypal.configure({
			'mode': 'sandbox',
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
					"return_url": "https://" + serverHost + "/payment-approved",
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

function createBillingPlan(apiKey, apiSecret, callback){
	if(apiKey && apiSecret){

		//configure paypal
		paypal.configure({
			'mode': 'sandbox',
			'client_id': apiKey,
			'client_secret': apiSecret,
			'headers' : {
			'custom': 'header'
			}
		});

		var isoDate = new Date();
		isoDate.setSeconds(isoDate.getSeconds() + 10);
		isoDate = isoDate.toISOString().slice(0,19) + 'Z';
		console.log(isoDate);

		var billingPlanAttributes = {
		    "description": "Create Plan for Regular",
		    "merchant_preferences": {
		        "auto_bill_amount": "yes",
		        "cancel_url": "https://" + serverHost + "/",
		        "initial_fail_amount_action": "continue",
		        "max_fail_attempts": "1",
		        "return_url": "https://" + serverHost + "/agreement-approved",
		        "setup_fee": {
		            "currency": "USD",
		            "value": "25"
		        }
		    },
		    "name": "Testing1-Regular1",
		    "payment_definitions": [
		        {
		            "amount": {
		                "currency": "USD",
		                "value": "100"
		            },
		            "charge_models": [
		                {
		                    "amount": {
		                        "currency": "USD",
		                        "value": "10.60"
		                    },
		                    "type": "SHIPPING"
		                },
		                {
		                    "amount": {
		                        "currency": "USD",
		                        "value": "20"
		                    },
		                    "type": "TAX"
		                }
		            ],
		            "cycles": "0",
		            "frequency": "DAY",
		            "frequency_interval": "1",
		            "name": "Regular 1",
		            "type": "REGULAR"
		        },
		        {
		            "amount": {
		                "currency": "USD",
		                "value": "20"
		            },
		            "charge_models": [
		                {
		                    "amount": {
		                        "currency": "USD",
		                        "value": "10.60"
		                    },
		                    "type": "SHIPPING"
		                },
		                {
		                    "amount": {
		                        "currency": "USD",
		                        "value": "20"
		                    },
		                    "type": "TAX"
		                }
		            ],
		            "cycles": "4",
		            "frequency": "DAY",
		            "frequency_interval": "1",
		            "name": "Trial 1",
		            "type": "TRIAL"
		        }
		    ],
		    "type": "INFINITE"
		};

		var billingAgreementAttributes = {
		    "name": "Fast Speed Agreement",
		    "description": "Agreement for Fast Speed Plan",
		    "start_date": isoDate,
		    "plan": {
		        "id": "P-0NJ10521L3680291SOAQIVTQ"
		    },
		    "payer": {
		        "payment_method": "paypal"
		    },
		    "shipping_address": {
		        "line1": "StayBr111idge Suites",
		        "line2": "Cro12ok Street",
		        "city": "San Jose",
		        "state": "CA",
		        "postal_code": "95112",
		        "country_code": "US"
		    }
		};

		var billingPlanUpdateAttributes = [
		    {
		        "op": "replace",
		        "path": "/",
		        "value": {
		            "state": "ACTIVE"
		        }
		    }
		];

		paypal.billingPlan.create(billingPlanAttributes, function (error, billingPlan) {
		    if (error) {
		        console.log(error);
						callback(billingPlan)
						//throw error;
		    } else {
		        console.log("Billing Plan Created");

						billingAgreementAttributes.plan.id = billingPlan.id;
						// Activate the plan by changing status to Active
		        paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, function (error, response) {
		            if (error) {
		                console.log(error);
		                //throw error;
		            } else {
		                console.log("Billing Plan state changed to " + billingPlan.state);
		                billingAgreementAttributes.plan.id = billingPlan.id;

		                // Use activated billing plan to create agreement
		                paypal.billingAgreement.create(billingAgreementAttributes, function (error, billingAgreement) {
		                    if (error) {
		                        console.log(error);
		                        //throw error;
		                    } else {
		                        console.log("Billing Agreement Created from Billing Plan");
		                        //console.log(billingAgreement);
														callback(billingAgreement)

		                    }
		                });
		            }
		        });
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
