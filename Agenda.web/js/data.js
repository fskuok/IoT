app_data = {
    "google_spreadsheet":{
        "agenda_data_key": "1rGsUNIk_zhfuNUMglR-4My7vPqku-sZg8JBYkKp9Qf4",
        "spark_data_key": "11fi7mpyJZNgMvyP9qtCYFzPUNSQV4CDGsyXFqZnOl10"
    },
    "panel": {
        "ignored_devices": "Spark Cloud,",
        "ignored_vars" : "key, status, getVar, callFn,",
        "meeting_messages" : ['Meeting going to begin', 'Meeting ongoing', 'Meeting ended']
    },
    "rules": {
        "type":{
            'break':{
                'start:0:0:0': "turnOnLight | turnOnProjector",
                'end:0:0:0': "turnOffLight"
            },
            'presentation': {
                'start:0:0:0': "turnOffLight | turnOnProjector"
            },
            'speech': {
                'start:0:0:0': "turnOnLight | turnOffProjector"
            }
        },
        "index": {
            'first':{

            },
            'last':{

            }
        }
    }
};
