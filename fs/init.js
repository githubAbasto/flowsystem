load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_rpc.js');
load('api_mqtt.js');
load('api_timer.js');
load('api_sys.js');
load('api_dallas_rmt.js');
load('api_bme280.js')


let online = false;                               // Connected to the cloud?
let temp; // Global temp
let returnTemp;
let hourMinTemp = [99, 100];
hourMinTemp.length=2;
let hourMaxTemp = [-99 , -99];
hourMaxTemp.length=2
let time =0;

//let setLED = function(on) {
//  let level = onhi ? on : !on;
//  GPIO.write(led, level);
// print('LED on ->', on);
//};

GPIO.set_mode(17, GPIO.MODE_OUTPUT);
//setLED(state.on);

let myDT = DallasRmt.create(16, 0, 1);
//myDT.begin();
print('Heat TempSensors found:', myDT.getDeviceCount());
myDT.requestTemperatures();
let returnTempDT = DallasRmt.create(2, 2, 3);

print('Return TempSensors found:', returnTempDT.getDeviceCount());
returnTempDT.requestTemperatures();
// BME280Data.create();
//let sensor1 = BME280.createI2C(4);
//sensor1.readAll();
//  print('BME sensor read successfull');
//  print('Temp:',bmeData.temp(),' Humidity:',bme1Data.humid(),' Pressure:',bmeData.press());



//Update state every second, and report to cloud if online
Timer.set(2000, Timer.REPEAT, function() {
  temp = myDT.getTempCByIndex(0);
  let returnTemp =myDT.getTempCByIndex(0);
  
  if( (hourMinTemp[time]) > (temp) )
    hourMinTemp[time]=temp;

  myDT.requestTemperatures();// start a new conversion
  returnTempDT.requestTemperatures();

  print('online:', online, 'HighTempSensor:',temp,'ReturnTemp:',returnTempDT, 'time', time);
  if (online) reportState();
  
  if (temp>35) { 
    GPIO.write(17,1);
  } else {
    GPIO.write(17,0);
  }
  if (temp>80) {
    GPIO.write(4, 1); 
  } else { 
    GPIO.write(4.0);
  }
}, null) ;

function reportState() {
    let message = JSON.stringify(temp);
    let sendMQTT = true;

//    let minTemp = Math.min(hourMinTemp);
    //Math.min
    //let maxTemp = Math.max(hourMaxTemp);
  
    // AWS is handled as plain MQTT since it allows arbitrary topics.
    if (MQTT.isConnected() && sendMQTT) {
      let topic = Cfg.get('device.id') + '/temp';
      print('== Publishing to ' + topic + ':', message);
      MQTT.pub(topic, message, 0 /* QoS */);
      
      //let message = JSON.stringify(hourMinTemp[0]);
      //let topic = Cfg.get('device.id') + '/mintemp';
      //print('== Publishing to ' + topic + ':', message,'MinTemp:',minTemp);
      //
      MQTT.pub(topic, message, 0 /* QoS */);

    } else if (sendMQTT) {
      print('== Not connected!');
    }

} 

Event.on(Event.CLOUD_CONNECTED, function() {
  online = true;
//  Shadow.update(0, {ram_total: Sys.total_ram()});
}, null);

Event.on(Event.CLOUD_DISCONNECTED, function() {
  online = false;
}, null);
