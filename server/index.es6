import express from 'express'
import redis from 'redis'
import bodyParser from 'body-parser'

const PORT = process.env.PORT || 3000;

const app = express();

app.use(bodyParser.json());
app.get('/:id', (req, res) => {
  if(!req.params.id) return res.redirect('/');
  var {id} = req.params;
  var client = redis.createClient();
  return client.get(id, (err, reply) => {
    if(err) return res.json({status: 500, msg: err});
    if(!reply) return res.json({ status: 404, data: reply});
    client.end();
    return res.json({ status: 200, data: JSON.parse(reply) });
  });
});

app.put('/:id', (req, res) => {
  if(!req.params.id) return res.redirect('/');
  var {id} = req.params;
  var {meta} = req.body;
  if(!meta) return res.json({ status: 400, msg: "Please use correct format!"});
  var client = redis.createClient();
  client.get(id, (err, reply) => {
    if(err) return res.json({status: 500, msg: err});
    if(!reply) return res.json({ status: 404, data: reply});
    var data = JSON.parse(reply);
    data.meta = meta;
    client.set(id, JSON.stringify(data));
    client.end();
    return res.json({status: 200, msg: `${id} updated success`});
  });
});


app.get('/', (req, res) => { return res.json({ status: 200, msg: 'Gazette API'});})
app.listen(PORT, ()=> { console.log(`Server Listen on ${PORT}.`)});