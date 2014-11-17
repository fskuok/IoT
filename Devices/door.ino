const int doorSensorA = A7;
const int doorSensorB = A0;
const int valveA = 210;
const int valveB = 240;
const int checkingLength = 500; //ms
const int delayAfterCount = 500; //ms
const int recheckTimes = 50;
const int checkingInterval = checkingLength/recheckTimes; //ms

int peopleCounts = 0; 
int sensorAValue = 0; //Analog measure of sensor1
int sensorBValue = 0; //Analog meausre of sensor2
int recheckCounter = 0;

void setup() {
    
    pinMode( doorSensorA, INPUT );
    pinMode( doorSensorB, INPUT );
    
    Spark.variable( "peopleCounts", &peopleCounts, INT );
    Spark.variable( "sensorAValue", &sensorAValue, INT );
    Spark.variable( "sensorBValue", &sensorBValue, INT );
    Spark.function( "resetPeopleCounts", resetPeopleCounts );
    
}

void loop() {
    
    recheckCounter = 50;

    sensorAValue = analogRead( doorSensorA );
    sensorBValue = analogRead( doorSensorB );
    
    //if A is blocked and B is not
    if( analogRead( doorSensorA ) >= valveA && analogRead( doorSensorB ) < valveB ){
        
        while( recheckCounter >= 0 ){
            sensorAValue = analogRead( doorSensorA );
            sensorBValue = analogRead( doorSensorB );
            
            //if B is blocked
            if( analogRead( doorSensorB ) >= valveB ){
                
                peopleCounts++; //add people count
                delay( delayAfterCount );
                recheckCounter = 0; //break the while loop
            }
            
            delay( checkingInterval );
            recheckCounter--;
        }
        
    //if B is blocked and A is not
    }else if( analogRead( doorSensorA ) < valveA && analogRead( doorSensorB ) >= valveB ){
        
        while( recheckCounter >= 0 ){
            
            sensorAValue = analogRead( doorSensorA );
            sensorBValue = analogRead( doorSensorB );
            
            //if A is blocked
            if( analogRead( doorSensorA ) >= valveA ){
                
                peopleCounts--; //minus people count
                delay( delayAfterCount );
                recheckCounter = 0; //break the while loop
            } 
            
            delay( checkingInterval );
            recheckCounter--;
        }
        
    }
}

int resetPeopleCounts(String whatever){
    peopleCounts = 0;
    return 1;
}
    

