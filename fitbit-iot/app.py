import time
import requests
import json
from flask import Flask
app = Flask(__name__)
from firebase import firebase
firebase = firebase.FirebaseApplication('https://mediocre-unihack.firebaseio.com/', None)

FIREBASE_URL = "https://mediocre-unihack.firebaseio.com/"

@app.route("/")
def main():
    return "Hello world"


# https://api.fitbit.com/1/user/4RB94K/activities/heart/date/today/7d.json

FITIBIT_API = "https://api.fitbit.com/1/user/"
FITBIT_DEV_USER_AC = "4RB94K"
TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0UkI5NEsiLCJhdWQiOiIyMkNYR00iLCJpc3MiOiJGaXRiaXQiLCJ0eXAiOiJhY2Nlc3NfdG9rZW4iLCJzY29wZXMiOiJyc29jIHJzZXQgcmFjdCBybG9jIHJ3ZWkgcmhyIHJudXQgcnBybyByc2xlIiwiZXhwIjoxNTMzNDMyMzUyLCJpYXQiOjE1MzI4Mjc3NzB9.TRoVPx-Ql69GxmPCylql3fx4NwyvJpHXUR_6G5-AJNc"
AUTH = "Bearer %s" % TOKEN

REFRESH_TOKEN = "5c32a9299fdb366d13be8dbc8aa26c1909385f307f5fda3d9c99d7ce5f65be3e"

FITBIT_HEART_RATE = "%s%s/activities/heart/date/today/1d.json" % (FITIBIT_API, FITBIT_DEV_USER_AC)

# {"activities-heart":[{"dateTime":"2018-07-29","value":{"customHeartRateZones":[],"heartRateZones":[{"max":99,"min":30,"name":"Out of Range"},{"max":138,"min":99,"name":"Fat Burn"},{"max":168,"min":138,"name":"Cardio"},{"max":220,"min":168,"name":"Peak"}]}}]}

def refresh_token():
    "Authorization"
    url = "https://api.fitbit.com/oauth2/token"
    data = {"grant_type": "refresh_token", "refresh_token": "5c32a9299fdb366d13be8dbc8aa26c1909385f307f5fda3d9c99d7ce5f65be3e"}
    headers = {"Authorization": "Basic MjJDWEg3OjZhZjVlZTBlYjQ2OWE3MzM3NWU0YjY0ZDQ3ZTc2Zjdl",
               "Content-Type": "application/x-www-form-urlencoded"}
    tok_response = requests.post(url, headers=headers, data=data)
    tok = json.loads(tok_response.text)
    print(tok)
    TOKEN = tok['access_token'] # This will refresh our token yay.


def check_heart_rate():
    response = requests.get(
        FITBIT_HEART_RATE,
        headers={"Authorization": AUTH}
    )
    print(response.text)
    # {"activities-heart":[{"dateTime":"2018-07-29","value":{"customHeartRateZones":[],"heartRateZones":[{"max":99,"min":30,"name":"Out of Range"},{"max":138,"min":99,"name":"Fat Burn"},{"max":168,"min":138,"name":"Cardio"},{"max":220,"min":168,"name":"Peak"}]}}]}
    resting_heart_rate = 63 # Avg base.
    relevant = json.loads(response.text)["activities-heart"]
    if "values" in relevant:
        if "restingHeartRate" in relevant["values"] and relevant["values"]["restingHeartRate"] > 0:
            resting_heart_rate = relevant["values"]["restingHeartRate"]
    firebase_value = firebase.get("/fitbit/resting_heart_rate", None)
    print("resting_heart_rate firebase value: %s" % firebase_value)
    if firebase_value is None or firebase_value != resting_heart_rate:
        firebase.patch(FIREBASE_URL + '/fitbit', {'resting_heart_rate': resting_heart_rate})

# GET https://api.fitbit.com/1.2/user/[user-id]/sleep/date/[date].json
def check_sleep():
    fitbit_sleep = "%s%s/sleep/date/today.json" % (FITIBIT_API, FITBIT_DEV_USER_AC)
    response = requests.get(
        fitbit_sleep,
        headers={"Authorization": AUTH}
    )
    print(response.text)
    # {"sleep":[],"summary":{"totalMinutesAsleep":0,"totalSleepRecords":0,"totalTimeInBed":0}}
    # Sleep, total mins asleep
    res_dict = json.loads(response.text)
    sleep_mins = res_dict["summary"]["totalMinutesAsleep"]
    # Fitbit returns nothing.
    if sleep_mins == 0:
        sleep_mins = 276
    firebase_value = firebase.get("/fitbit/sleep", None)
    print("sleep firebase value: %s" % firebase_value)
    if firebase_value is None or sleep_mins > firebase_value:
        firebase.patch(FIREBASE_URL + '/fitbit', {'sleep_mins': sleep_mins})


# GET https://api.fitbit.com/1/user/[user-id]/foods/log/date/[date].json
def check_food():
    fitbit_food = "%s%s/foods/log/date/today.json" % (FITIBIT_API, FITBIT_DEV_USER_AC)
    response = requests.get(
        fitbit_food,
        headers={"Authorization": AUTH}
    )
    print(response.text)
    foods = json.loads(response.text)["foods"]
    post_foods = []
    for food_entry_dict in foods:
        post_foods.append(food_entry_dict["loggedFood"]["name"])
    firebase_value = firebase.get("/fitbit/foods", None)
    if firebase_value is None:
        firebase.patch(FIREBASE_URL + 'fitbit', {'foods': post_foods})
    else:
        print("firebase foods: %s" % firebase_value)
        # assuming indexed in the same way.
        posted_len = len(firebase_value)
        fitbit_food_len = len(post_foods)
        print("fitbit foods: %s" % post_foods)

        up_to = fitbit_food_len - posted_len
        to_post = post_foods[:up_to]
        print("to post food: %s" % to_post)
        firebase.patch(FIREBASE_URL + 'fitbit', {'foods': post_foods})


    # {"foods":[{"isFavorite":false,"logDate":"2018-07-29","logId":15152856175,"loggedFood":{"accessLevel":"PUBLIC","amount":1,"brand":"","calories":381,"foodId":81003,"locale":"en_US","mealTypeId":1,"name":"Salmon","unit":{"id":304,"name":"serving","plural":"servings"},"units":[304,226,180,147,389]},"nutritionalValues":{"calories":381,"carbs":15.5,"fat":15.02,"fiber":3,"protein":37.12,"sodium":302}}],"summary":{"calories":381,"carbs":15.5,"fat":15.02,"fiber":3,"protein":37.12,"sodium":302,"water":500}}

# GET https://api.fitbit.com/1/user/[user-id]/foods/log/water/date/[date].json
def check_water():
    fitbit_water = "%s%s/foods/log/water/date/today.json" % (FITIBIT_API, FITBIT_DEV_USER_AC)
    response = requests.get(
        fitbit_water,
        headers={"Authorization": AUTH}
    )
    print(response.text)
    # {"summary":{"water":500},"water":[{"amount":500,"logId":5435932865}]}
    res_dict = json.loads(response.text)
    water_ml = res_dict["summary"]["water"]
    firebase_value = firebase.get("/fitbit/water_ml", None)
    print("water firebase value: %s" % firebase_value)
    if firebase_value is None or water_ml > firebase_value:
        firebase.patch(FIREBASE_URL + '/fitbit', {'water_ml': water_ml})



# Pools FitBit and updates Firebase.
@app.route("/poll")
def poll():
    timeout_seconds = 30
    while True:
        try:
            check_heart_rate()
            check_sleep()
            check_water()
            check_food()
        except Exception as e:
            print("Exception: %s" % e)
        time.sleep(timeout_seconds)
    return "polling"

if __name__ == "__main__":
    app.run(threaded=True, port=1333)