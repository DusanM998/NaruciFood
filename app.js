const express = require("express");
const path = require("path")
const logger = require("morgan");
const bodyParser = require("body-parser");
const neo4j = require("neo4j-driver");
const alert = require("alert");

let loggedUser = "";
let izabraniRestoran = "";
let dostupnaHrana = [];


//App settings
const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/css", express.static("css"));


//DB
const uri = 'neo4j+s://9f38d6d9.databases.neo4j.io';
const user = 'neo4j';
const password = 'yv6trHIBlQ3FEQzFdkS0F_3MghIwTQSzwbMoBdsjLws';
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
const session = driver.session()

//Listen
PORT = 3000;

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});


//Welcome
app.get("/", (req, res) => {
  res.render("welcome");
})

app.get("/register", (req, res) => { 
  res.render("register");
});

app.get("/login", (req, res) => { 
  res.render("login");
});


//REGISTER User
app.post("/register", (req, res) => {
  const ime = req.body.ime;
  const prezime = req.body.prezime;
  const adresa = req.body.adresa;
  const mail = req.body.mail;
  const username = req.body.username;
  const password = req.body.password;
  const brojTelefona = req.body.brojTelefona;
  const adminPriv = false;
  console.log(mail);
  session
    .run(`CREATE (n:User {ime:"${ime}", prezime:"${prezime}", mail:"${mail}" ,username:"${username}", adresa:"${adresa}", password:"${password}", adminPriv:"${adminPriv}", brojTelefona:"${brojTelefona}"}) RETURN n`)
    .then((result) => {
      res.redirect("login");
      })
  .catch((err) => console.log(err));
})

//LOGIN User
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  session.run(`MATCH(n:User {username:"${username}"}) RETURN n`)
    .then((result) => {
      if (!result.records[0])
      {
        alert("Nepostojeci korisnik.")
      }
      else {
        const pw = result.records[0]._fields[0].properties.password;
        if (password == pw)
        {
          loggedUser = username;
          res.redirect(`/user/${username}`);
        }
        else
          alert("Pogresna sifra.")
      }
    })
  .catch((err) => console.log(err));
})

//GET USER
app.get("/user/:username", (req, res) => {
  const username = req.params.username;
  session.run(`MATCH(a:User {username:"${username}"}),(b:Restoran ) RETURN a,b`)
    .then((result) => {
      const user = ({
        id: result.records[0]._fields[0].identity.low,
        ime: result.records[0]._fields[0].properties.ime,
        prezime: result.records[0]._fields[0].properties.prezime,
        adresa: result.records[0]._fields[0].properties.adresa,
        mail: result.records[0]._fields[0].properties.mail,
        username: result.records[0]._fields[0].properties.username,
        password: result.records[0]._fields[0].properties.password,
        adminPriv: result.records[0]._fields[0].properties.adminPriv,
        brojTelefona: result.records[0]._fields[0].properties.brojTelefona
      })
      var restorani = [];
      result.records.forEach((record) => {
        restorani.push({
          id: record._fields[1].identity.low,
          naziv: record._fields[1].properties.naziv,
          adresa: record._fields[1].properties.adresa
        });
      });
      if (loggedUser != "admin")
      {
        res.render("korisnikProfil", {
          user,
          restorani
        });
      }
      else {
        res.render("adminProfil", {
          user,
          restorani
        });
      }
            
      
    })
  .catch((err) => console.log(err));
})

//ADD Restoran
app.post("/restoran/add", (req, res) => {
  const naziv = req.body.naziv;
  const adresa = req.body.adresa;
  session
    .run(`CREATE (n:Restoran {naziv:"${naziv}", adresa:"${adresa}"}) RETURN n`)
    .then((result) => {
      alert("Uspesno dodat restoran.")
      res.redirect(`/user/${loggedUser}`);
      })
  .catch((err) => console.log(err));
})

//DELETE Restoran
app.post("/restoran/delete", (req, res) => {
  const naziv = izabraniRestoran;
  session
    .run(`MATCH (n:Restoran {naziv:"${naziv}"}) detach DELETE n`)
    .then((result) => {
      alert("Uspesno obrisan restoran.");
      res.redirect(`/user/${loggedUser}`);
      })
  .catch((err) => console.log(err));
})

//Filter restorana
app.post("/filterRestoranaPoNazivu", (req, res) => {
  const username = loggedUser;
  const naziv = req.body.naziv;
  izabraniRestoran = naziv;
  var hranaArray = [];
  dostupnaHrana = [];
  session
    .run(`MATCH p=(a:Restoran {naziv:"${naziv}"})-[r:Nudi]->() RETURN p`)
    .then((result) => {
      result.records.forEach((record) => {
        hranaArray.push({
          naziv: record._fields[0].end.properties.naziv,
          cena: record._fields[0].end.properties.cena
        })
      })
      hranaArray.forEach(hrana => {
        dostupnaHrana.push(hrana.naziv);
      })
      if (loggedUser != "admin")
      {
        res.render("restoran", {
          username:username,
          hrana:hranaArray
        });
      }
      else {
        res.render("adminRestoran", {
          username:username,
          hrana:hranaArray
        });
      }
      
      })
  .catch((err) => console.log(err));
})

//ADD Hrana
app.post("/hrana/add", (req, res) => {
  const nazivRest = izabraniRestoran;
  const nazivHrane = req.body.naziv;
  const cena  = req.body.cena;
  session
    .run(`Match (a:Restoran {naziv:"${nazivRest}"}) create (b:Hrana {naziv:"${nazivHrane}", cena:"${cena}"}),(a)-[r:Nudi]->(b)`)
    .then((result) => {
      alert("Uspesno dodato jelo.");
      res.redirect(`/user/${loggedUser}`);
      })
  .catch((err) => console.log(err));
})


//UPDATE Hrana
app.post("/hrana/update", (req, res) => {
  const naziv = req.body.naziv;
  const novaCena = req.body.novaCena;
  let ima = 0;
  dostupnaHrana.forEach(hr => {
    if (naziv == hr)
      ima = 1;
  })

  if (ima == 1) {
    session
    .run(`MATCH (n:Hrana {naziv:"${naziv}"}) SET n.cena="${novaCena}"`)
    .then((result) => {
      console.log(result);
      alert("Uspesno promenjena cena");
      res.redirect(`/user/${loggedUser}`);
      })
    .catch((err) => console.log(err));
  }
  else
    alert("Ne postoji to jelo.");
})
  


//Create Narudzbina
app.post("/naruci", (req, res) => {
  let ima = 0;
  const hrana = req.body.naziv;
  const username = loggedUser;
  const restoran = izabraniRestoran;
  var datum = new Date();
  var dd = String(datum.getDate()).padStart(2, '0');
  var mm = String(datum.getMonth() + 1).padStart(2, '0');
  var yyyy = datum.getFullYear();
  datum = mm + '/' + dd + '/' + yyyy;
  dostupnaHrana.forEach(hr => {
    if (hrana == hr)
      ima = 1;
  })

  if (ima == 1) {
    session
      .run(`MAtch (a:User {username:"${username}"}) create (b:Narudzbina {user:"${username}",restoran:"${restoran}", hrana:"${hrana}", datum:"${datum}"}),(a)-[r:JeNarucio]->(b)`)
      .then((result) => {
        alert("Uspesna narudzbina");
        res.redirect(`/user/${loggedUser}`);
      })
      .catch((err) => console.log(err));
  }
  else
    alert("Zao nam je to jelo nemamo u ponudi.");
})

//Get Users
/*app.get("/users", (req, res) => {
  session.run("MATCH(n:User) RETURN n")
    .then((result) => {
      var userArray = [];
      result.records.forEach((record) => {
        userArray.push({
          id: record._fields[0].identity.low,
          name: record._fields[0].properties.name,
          username: record._fields[0].properties.username,
          password: record._fields[0].properties.password,
          adminPriv: record._fields[0].properties.adminPriv
        })
      })
      res.render("users", {
        users:userArray
      });
    })
  .catch((err) => console.log(err));
})*/

//Get Restoran
/*app.get("/restorani", (req, res) => {
  console.log("Pozvana");
  session
    .run("MATCH(n:Restoran) RETURN n LIMIT 25")
    .then((result) => {
      var restorani = [];
      result.records.forEach((record) => {
        restorani.push({
          id: record._fields[0].identity.low,
          naziv: record._fields[0].properties.naziv,
          adresa: record._fields[0].properties.adresa
        });
      });
      res.render("korisnikProfil", {
        restorani: restorani
      });
    })
  .catch((err) => console.log(err));
})*/

//Get Hrana
/*app.get("/hrana", (req, res) => {
  console.log("Pozvana");
  session.run("MATCH(n:Hrana) RETURN n LIMIT 25")
    .then((result) => {
      var hranaArray = [];
      result.records.forEach((record) => {
        hranaArray.push({
          id: record._fields[0].identity.low,
          naziv: record._fields[0].properties.naziv,
          cena: record._fields[0].properties.cena
        })
      })
      console.log(hranaArray)
      res.render("hrana", {
        hrana:hranaArray
      });
    })
  .catch((err) => console.log(err));
})*/

//FILTER po hrani
/*app.get("/hrana/:naziv", (req, res) => {
  const naziv = req.params.naziv;
  session.run(`MATCH(a:Hrana {naziv:"${naziv}"}),p=(a)-[r:SeMozeNaci]->(b) RETURN b`)
    .then((result) => {
      var restoranArray = [];
      result.records.forEach((record) => {
        restoranArray.push({
          id: record._fields[0].identity.low,
          naziv: record._fields[0].properties.naziv,
          adresa:record._fields[0].properties.adresa
        })
      })
      console.log(restoranArray)
      res.send("Uspesno");
    })
  .catch((err) => console.log(err));
  
})*/

module.exports = app;


