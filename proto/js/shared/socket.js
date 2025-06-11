var SocketIO = function(active){

  var self = this;
  var idUnique = Math.random();
  var listeners = [];
  
  this.rollcall = [];
  
  var key = 'o7g3NA8b2j4wp1aSBQgGj8Xn6JgSd4v5xYiqnXww';
  var channel = 1; // from 1 to 10,000,000 // need a new channel for every "sandbox" of comms
  var endpoint = `wss://s3882.sgp1.piesocket.com/v3/${channel}?api_key=${key}&notify_self=1`;

  var s;

  if(active){
    s = new WebSocket(endpoint);
    s.onmessage = onMessage;

    s.onclose   = function(evt) { 
      console.log('socket',evt.type);
    };
    s.onerror   = function(evt) { 
      console.log('socket',evt.type);
    };
    s.onopen    = function(evt) { 
      console.log('socket',evt.type);
      self.send('checkin',idUnique);

      window.onbeforeunload = function(){
        self.send('checkout',idUnique);
      }
    };
  }

  this.send = function(t,d){
    console.log('send',t,d);
    if(s) s.send(JSON.stringify([t,d])); 
  }

  this.activate = function(){
    //it's button time
    if(s) this.send('activate');
  }

  this.deactivate = function(){
    //it's not button time
    if(s) this.send('deactivate');
  }

  function onMessage(m){
    console.log('socket',m.type,m.data);
    var d = JSON.parse(m.data);
    
    if(d[0] == 'checkin' && d[1] != idUnique){ // someone has checked in
      self.rollcall.push(d[1]); 
    }
    if(d[0] == 'checkout' && d[1] != idUnique){ // someone has checked out
      var iCheckout = -1;
      for(var i in self.rollcall) if(self.rollcall[i] == d[1]) iCheckout = i;
      if(iCheckout >= 0) self.rollcall.splice(iCheckout,1);
    }

    for(var i in listeners) if(listeners[i].type == d[0]) listeners[i].fn(d[1]);
  }

  this.addListener = function(type,fn){
    listeners.push({type:type,fn:fn});
  }
}