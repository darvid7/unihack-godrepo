package dlei.com.unihack2018meditracesensor;

import android.annotation.SuppressLint;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.support.v7.widget.AppCompatButton;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;

import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

public class MainActivity extends AppCompatActivity implements SensorEventListener {

    private AppCompatButton mSynchronizeButton;
    private SensorManager mSensorManager;
    private Sensor mSensorAccelerometer;
    private Sensor mSensorGyroscope;
    private Sensor mSensorTemperature;
    private Sensor mSensorHumidity;


    private double accelerometerX;
    private double accelerometerY;
    private double accelerometerZ;

    private double gyroscopeX;
    private double gyroscopeY;
    private double gyroscopeZ;

    private double startAccelerometerX;
    private double startAccelerometerY;
    private double startAccelerometerZ;

    private double startGyroX;
    private double startGyroY;
    private double startGyroZ;

    private double mostRecentTemperature = 0;
    private double mostRecentHumidity = 0;

    // return the inner product of this Vector a and b.
    public double dot(double[] start, double[] end) {
        double sum = 0.0;
        for (int i = 0; i < start.length; i++)
            sum = sum + (start[i] * end[i]);
        return sum;
    }

    // return the Euclidean norm of this Vector.
    public double magnitude(double[] vector3d) {
        if (vector3d.length != 3) {
            throw new RuntimeException("NANI THE FUCK");
        }
        return Math.sqrt(vector3d[0] * vector3d[0] + vector3d[1] * vector3d[1] + vector3d[2] * vector3d[2]);

    }

    @Override
    protected void onResume() {
        // Register a listener for the sensor.
        super.onResume();

        mSensorManager.registerListener(this, mSensorAccelerometer, SensorManager.SENSOR_DELAY_NORMAL);
        mSensorManager.registerListener(this, mSensorGyroscope, SensorManager.SENSOR_DELAY_NORMAL);
        mSensorManager.registerListener(this, mSensorTemperature, SensorManager.SENSOR_DELAY_NORMAL);
        mSensorManager.registerListener(this, mSensorHumidity, SensorManager.SENSOR_DELAY_NORMAL);
    }

    @Override
    protected void onPause() {
        // Be sure to unregister the sensor when the activity pauses.
        super.onPause();
        mSensorManager.unregisterListener(this);
    }

    @SuppressLint("ClickableViewAccessibility")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mSensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        mSensorAccelerometer = mSensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        mSensorGyroscope = mSensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
        mSensorTemperature = mSensorManager.getDefaultSensor(Sensor.TYPE_AMBIENT_TEMPERATURE);
        mSensorHumidity = mSensorManager.getDefaultSensor(Sensor.TYPE_RELATIVE_HUMIDITY);

        mSynchronizeButton = findViewById(R.id.synchronizeButton);
        mSynchronizeButton.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {

                switch(event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        // PRESSED
                        Log.d("sync", "down pressed");
                        startAccelerometerX = accelerometerX;
                        startAccelerometerY = accelerometerY;
                        startAccelerometerZ = accelerometerZ;

                        startGyroX = gyroscopeX;
                        startGyroY = gyroscopeY;
                        startGyroZ = gyroscopeZ;

                        return true;
                    case MotionEvent.ACTION_UP:
                        // RELEASED
                        Log.d("sync", "released");
//                        Combined, but gyro kinda sucks just just use acc.
//                        double[] start = {
//                                (startAccelerometerX + startGyroX) / 2,
//                                (startAccelerometerY + startGyroY) /2,
//                                (startAccelerometerZ + startAccelerometerZ) /2
//                        };
//                        double[] end = {
//                                (accelerometerX + startGyroX) / 2,
//                                (accelerometerY + startGyroY) / 2,
//                                (accelerometerZ + startGyroZ) / 2
//                        };
//                        double dotProduct = dot(start, end);
//                        Log.i("sync", "dot product: " + dotProduct);
//                        double startMagnitude = magnitude(start);
//                        double endMagnitude = magnitude(end);
//                        double anglePreCos = dotProduct / (startMagnitude * endMagnitude);
//                        double angleDegrees = Math.toDegrees(Math.acos(anglePreCos));
//                        Log.d("sync", "Angle degrees: " + angleDegrees);

                        // Just Accelerometer.
                        double[] startAc = {startAccelerometerX, startAccelerometerY, startAccelerometerZ};
                        double[] endAc = {accelerometerX, accelerometerY, accelerometerZ};
                        double dotProductAc = dot(startAc, endAc);
                        double startMagnitudeAc = magnitude(startAc);
                        double endMagnitudeAc = magnitude(endAc);
                        double anglePreCosAc = dotProductAc / (startMagnitudeAc * endMagnitudeAc);
                        double angleDegreesAc = Math.toDegrees(Math.acos(anglePreCosAc));
                        Log.d("sync", "Angle degrees JUST ACCELEROMETER: " + angleDegreesAc);

                        // Just Gyroscope. - SEEMS MORE DODGY THAN ACCELEROMETER.
//                        double[] startGy = {startGyroX, startGyroY, startGyroZ};
//                        double[] endGy = {gyroscopeX, gyroscopeY, gyroscopeZ};
//                        double dotProductGy = dot(startGy, endGy);
//                        double startMagnitudeGy = magnitude(startGy);
//                        double endMagnitudeGy = magnitude(endGy);
//                        double anglePreCosGy = dotProductGy / (startMagnitudeGy * endMagnitudeGy);
//                        double angleDegreesGy = Math.toDegrees(Math.acos(anglePreCosGy));
//                        Log.d("sync", "Angle degrees JUST GYROSCOPE: " + angleDegreesGy);
                        postToFireBase(angleDegreesAc);
                        return true;
                }
                return false;
            }
        });

    }

    // Does all the things.
    public void postToFireBase(double rangeOfMotionAngle) {
        // Some phones don't have this so just set it to reasonable values.
        // I think http://webcusp.com/a-few-android-phones-that-have-temperature-sensor/ sums it up.
        // These are the values for tmr.
        if (mostRecentTemperature == 0.0) {
            mostRecentTemperature = 13.0;
        }
        if (mostRecentHumidity == 0.0) {
            // Is a percentage.
            mostRecentHumidity = 56;
        }
        Log.d("sync", "posing to firebase!");
        FirebaseDatabase database = FirebaseDatabase.getInstance();
        DatabaseReference myRef = database.getReference("android_sensor");
        myRef.child("humidity_percentage").setValue(mostRecentHumidity);
        myRef.child("ambient_temperature").setValue(mostRecentTemperature);
        myRef.child("range_of_motion_angle").setValue(rangeOfMotionAngle);

    }

    @Override
    public void onAccuracyChanged(Sensor arg0, int arg1) {
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            accelerometerX = event.values[0];
            accelerometerY = event.values[1];
            accelerometerZ = event.values[2];
            Log.v("sync", "accelerometer updating!");

            // Log.d("sync", String.format("accelerometer pre x: %s, y: %s, z: %s", accelerometerX, accelerometerY, accelerometerZ));
        } else if (event.sensor.getType() == Sensor.TYPE_GYROSCOPE) {
            Log.v("sync", "gyroscope updating!");
            gyroscopeX = event.values[0];
            gyroscopeY = event.values[1];
            gyroscopeZ = event.values[2];
        } else if (event.sensor.getType() == Sensor.TYPE_AMBIENT_TEMPERATURE) {
            Log.v("sync", "temperature updating!");
            mostRecentTemperature = event.values[0];
            Log.d("sync", "temp: " + mostRecentTemperature);

        } else if (event.sensor.getType() == Sensor.TYPE_RELATIVE_HUMIDITY) {
            Log.v("sync", "humidity updating!");
            mostRecentHumidity = event.values[0];
            Log.d("sync", "humidity: " + mostRecentHumidity);
        }

    }

}
