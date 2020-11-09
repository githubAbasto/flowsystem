load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_rpc.js');
load('api_mqtt.js');
load('api_timer.js');
load('api_sys.js');
//load('api_dallas_rmt.js');
load('api_bme280.js');


let DAC_out = ffi('void write_dac(int , int )');
let globalLight=0;

let online = false;                               // Connected to the cloud?

let temp; // Global temp
let returnTemp;
let hourMinTemp = [99, 100];
hourMinTemp.length=2;
let hourMaxTemp = [-99 , -99];
hourMaxTemp.length=2
let time =0;


GPIO.set_mode(17, GPIO.MODE_OUTPUT);
//setLED(state.on);

//let myDT = DallasRmt.create(16, 0, 1);
//myDT.begin();
//print('Heat TempSensors found:', myDT.getDeviceCount());
//myDT.requestTemperatures();
//let returnTempDT = DallasRmt.create(2, 2, 3);

//print('Return TempSensors found:', returnTempDT.getDeviceCount());
//returnTempDT.requestTemperatures();
 let bmedata= BME280Data.create();
let sensor1 = BME280.createI2C(118);


let LED =[127,127];     //Default value after power off...
if( globalLight===1)
  DAC_out(LED[0], LED[1]);

//Update state every 30 second, and report to cloud if online
Timer.set(15000, Timer.REPEAT, function() {

  //sensor1.readAll();
  if( sensor1.readAll(bmedata) ===0) {
        print('Temp:',bmedata.temp(),' Humidity:',bmedata.humid(),' Pressure:',bmedata.press());
  }
  else { // something got wrong with the sensor. Try to reconnect
    bmedata.free(); //Free the bme data object, and re init to make it all be 0
    bmedata=BME280Data.create();
    sensor1=BME280.createI2C(118);
  }
  if (online && bmedata.press!==0 ){ 
    reportState();
    GPIO.toggle(17);
  } 
}, null) ;

function reportState() {
    
    let sendMQTT = true;
    let message =JSON.stringify({ temp: bmedata.temp(), humid: bmedata.humid(), press: bmedata.press(), red: LED[0], white: LED[1], globallight: globalLight });
    if (MQTT.isConnected() && sendMQTT) {
      let topic = Cfg.get('site.id') + '/'+Cfg.get('site.position')+'/environment';
      print('== Publishing to ' + topic + ':', message);      
      MQTT.pub(topic, message, 0 /* QoS */);

    } else if (sendMQTT) {
      print('== Not connected!');
    }

} 

MQTT.sub( Cfg.get('site.id') + '/flowsystem/led', function(conn, topic, msg) {
  print('Topic:', topic, 'message:', msg);
  if (msg==='1') {
    globalLight=1;
    ///Turn on LEDs
    DAC_out(LED[0], LED[1]);
  }
  if (msg==='0'){
    globalLight=0;
    DAC_out(0,0);
  }
  print('Globallight=', globalLight);
  
}, null);


MQTT.sub(Cfg.get('site.id') +'/' + Cfg.get('site.position') + '/intensity', function(conn, topic, msg) {
  print('Topic:', topic, 'message:', msg);
  let data = JSON.parse(msg);
  print('data-red:', data.red, ' Data-white:', data.white);
  //Store new value for later use
  LED[0]=data.red;
  LED[1]=data.white;
  if (globalLight===1){
    // RED / White LED intensity 
    DAC_out(LED[0], LED[1]);
  }else {
    DAC_out(0, 0);
  }  

   
  
}, null);




Event.on(Event.CLOUD_CONNECTED, function() {
  online = true;
  GPIO.write(17,0); // LED ON wHen connected to cloud 
}, null);

Event.on(Event.CLOUD_DISCONNECTED, function() {
  online = false;
}, null);
