let express = require("express");
let session = require("express-session");
let mongo = require("mongodb");
let app = express();

let MongoClient = mongo.MongoClient;
let db;
const MongoDBStore = require('connect-mongodb-session')(session);

let store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/db',
  collection: 'sessiondata'
});

//Define session information settings
app.use(session({
  name:"db-session",
  secret: 'secret here',
  store: store,
  cookie:{
    maxAge: 1000*60*60*24*7
  }
}));

app.use(exposeSession)
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.set("view engine","pug");

//Setting GET routes
app.get("/", (req, res, next)=>{ res.render("pages/index")});
app.get("/users", listUsers);
app.get("/login", (req, res, next) => {res.render("pages/login")});
app.get("/logout", logout);
app.get("/register", (req, res, next)=>{res.render("pages/register")});
app.get("/orders", (req,res,next)=> {res.render("pages/orderform")});
app.get("/users/:userId", loadUser);

//Setting POST routes
app.post("/login", login);
app.post("/register", register);


/*
Function: exposeSession
Purpose: sets local var to request session and calls next
*/
function exposeSession(req, res, next){
  if(req.session)res.locals.session = req.session;
  next();
}

/*
Function: login
Purpose: logins the current session with the information provided and checks database to see if possible
in: req, session information
*/
function login(req, res, next){
  res.locals.session = req.session;
  db.collection("users").findOne(req.body, function(err, result){
		if(err){
			res.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			res.status(401).send("Unknown Username or password");

			return;
		}
    req.session.loggedin = true;
    req.session.user = result;
		res.status(200).redirect("/users/" + result._id);
	});
}

/*
Function: logout
Purpose: logs out the current session when called
in: req
*/
function logout(req, res, next){
  req.session.loggedin = false;
  res.status(200).redirect("/");
}

/*
Function: register
Purpose: Takes the sent information, error checks, and register user to database if possible
in: registrant username, password, and privacy
*/
function register(req, res, next){
  db.collection("users").findOne(req.body, function(err, result){
		if(err){
			res.status(500).send("Error reading database.");
			return;
		}
		if(!result){
      if((req.body.username.length == 0) || (req.body.password.length ==0)){
        res.status(400).redirect("/register");
        return;
      }

      db.collection("users").insertOne(
        {
          "username": req.body.username,
          "password": req.body.password,
          "privacy": false
        }
      );
      req.session.loggedin = true;
      db.collection("users").findOne(req.body, function(err, result){
        if(err){
          res.status(500).send("Error reading database.");
          return;
        }
        res.status(200).redirect("/users/" + result._id);
      });
		}else{
      res.status(409).redirect("/register");
      return;
    }
		
	});
}

/*
Function: listUsers
Purpose: Renders a dynamic pug template html page with public users in the database in the form of a list
in: req
out: res.render page
*/
function listUsers(req, res, next){
  let publicUsers = db.collection("users").find({"private": false}).toArray();
  res.render("pages/users", publicUsers);
}

/*
Function: loadUser
Purpose: Renders a dynamic pug template html page with the users in the database
in: req
out: res.render page
*/
function loadUser(req, res, next){
  let user = db.collection("users").find({_id: new mongo.ObjectId(req.params.userId)});
  res.render("pages/userpage", {user: user});
}

//Connects the database and launches the server on the current port or port 3000
MongoClient.connect("mongodb://localhost:27017/", function(err, client) {
  if(err) throw err;

  db = client.db('db');

  app.listen(process.env.PORT || 3000);
  console.log("Listening on port 3000");
});
