class App {
  constructor() {

    // Initialize Firebase and get a database object
    firebase.initializeApp(firebaseConfig);
    this.database = firebase.database();

    // Get jQuery objects for some key DOM elements
    this.dom = {
      newTrainForm: $("#newTrainForm"),
      scheduleTbl: $("#scheduleTbl"),
      trainNameInput: $("#trainNameInput"),
      destInput: $("#destInput"),
      startTimeInput: $("#startTimeInput"),
      frequencyInput: $("#frequencyInput")
    }

    this.trains = [];

    // Have we initialized and loaded data already?
    this.isAppInitialized = false;

    // Bind event handlers, so they can get at the goods with ".this"
    this._onNewTrainSubmit = this._onNewTrainSubmit.bind(this);
    this._onInitialDataLoad = this._onInitialDataLoad.bind(this);
    this._onNewTrainAdded = this._onNewTrainAdded.bind(this);
    this._onDeleteClick = this._onDeleteClick.bind(this);
    this.updateDepartures = this.updateDepartures.bind(this);

    // Arm event handlers
    this.dom.newTrainForm.on('submit', this._onNewTrainSubmit);
    this.dom.scheduleTbl.on('click', '.glyphicon-trash', this._onDeleteClick);
    this.database.ref().once('value', this._onInitialDataLoad, 
      (err) => { console.log(err) });
    this.database.ref().orderByChild("dateAdded").limitToLast(1).on("child_added", this._onNewTrainAdded, 
      (err) => { console.log(err) });

    this.updateIntervalId = setInterval(this.updateDepartures, 60 * 1000);

  }

  updateDepartures() {

    for (let i = 0; i < this.trains.length; i++) {

      if (this.trains[i].deleted) {
        continue;
      }

      this.trains[i].scheduleClock = moment(this.trains[i].startTime).format();
      let curTime = moment();
      let nextDeparture = NaN;

      let clockTick = function(trainId) {        
        let clock = moment(this.trains[trainId].scheduleClock);
        let freqMins = this.trains[trainId].freq;
        clock = moment(clock).add(freqMins, 'minutes');
        this.trains[trainId].scheduleClock = clock;

        if (this.trains[trainId].scheduleClock.isBefore(curTime)) {
          setTimeout(clockTick.bind(this, trainId), 0);
        } else {
          let trainRow = $('tr[data-id=' + trainId + ']');
          trainRow.find('.nextArrival').text(moment(this.trains[trainId].scheduleClock).format('HH:mm'));

          let minsAway = clock.diff(moment(), 'minutes');
          trainRow.find('.minsAway').text(minsAway);

        };
      };

      clockTick = clockTick.bind(this);
      clockTick(i);

    }
  }

  _onNewTrainSubmit(e) {
    // Don't refresh page
    e.preventDefault();

    // Get values from form fields
    let newName = this.dom.trainNameInput.val().trim();
    let newDest = this.dom.destInput.val().trim();
    let newFrequency = this.dom.frequencyInput.val().trim();
    let newStartTime = this.dom.startTimeInput.val().trim();

    if (!/[0-2]\d:[0-5]\d/.test(newStartTime) || parseInt(newStartTime.split(':')[0]) > 23) {
      this.dom.startTimeInput.addClass('inputValidationFailed');
    } else {

      this.database.ref().push({
        name: newName,
        dest: newDest,
        freq: newFrequency,
        startTime: newStartTime,
        dateAdded: firebase.database.ServerValue.TIMESTAMP
      });

      this.dom.trainNameInput.val("");
      this.dom.destInput.val("");
      this.dom.startTimeInput.val("");
      this.dom.frequencyInput.val("");
      this.dom.startTimeInput.removeClass('inputValidationFailed');
    }
  }

  _onInitialDataLoad(snapshot) {
    let trainData = snapshot.val();
    let scheduleArr = this.trains;
    let scheduleTbl = this.dom.scheduleTbl;
    let currentTime = moment();

    $.each(trainData, function(index,value) {
      let train = trainData[index];
      let startHour = train.startTime.split(':')[0];
      let startMin = train.startTime.split(':')[1];
      let startTime = moment().hour(startHour).minute(startMin).second(0).format();

      scheduleArr.push({ 
        name: train.name,
        dest: train.dest, 
        startTime: startTime, 
        freq: train.freq, 
        deleted: false, 
        key: index});

      var newRow = $(
        "<tr><td class='trainName'>" + 
        train.name + 
        "</td><td class='trainDest'>" +
        train.dest +
        "</td><td class='trainFreq'>" +
        train.freq +
        "</td><td class='nextArrival'>" +
        // Next Arrival
        "</td><td class='minsAway'>" +
        // Minutes Away
        //"</td><td>" +
        //"<span class='glyphicon glyphicon-trash'></span>" +
        "</td></tr>");

      newRow.attr('data-id', scheduleArr.length - 1);

      scheduleTbl.append(newRow);
    });
    this.isAppInitialized = true;

    this.updateDepartures();
  }

  _onNewTrainAdded(snapshot) {
    console.log(this.trains.indexOf(snapshot.key));

    if (this.isAppInitialized) {
      let newTrain = snapshot.val();
      let scheduleTbl = this.dom.scheduleTbl;

      console.log("New train added: " + snapshot.key);

      let startHour = newTrain.startTime.split(':')[0];
      let startMin = newTrain.startTime.split(':')[1];
      let startTime = moment().hour(startHour).minute(startMin).second(0).format();

      this.trains.push({ 
        name: newTrain.name, 
        dest: newTrain.dest, 
        startTime: startTime, 
        freq: newTrain.freq, 
        deleted: false,
        key: snapshot.key });

      let newRow = $(
        "<tr><td class='trainName'>" + 
        newTrain.name + 
        "</td><td class='trainDest'>" +
        newTrain.dest +
        "</td><td class='trainFreq'>" +
        newTrain.freq +
        "</td><td class='nextArrival'>" +
        // Next Arrival
        "</td><td class='minsAway'>" +
        // Minutes Away
        //"</td><td>" +
        //"<span class='glyphicon glyphicon-trash'></span>" +
        "</td></tr>");

      newRow.attr('data-id', this.trains.length - 1);

      scheduleTbl.append(newRow);

      this.updateDepartures();

    };
  }

  _onDeleteClick(e) {
    
    let trainRow = $(e.target).closest('tr');
    let trainId = trainRow.attr('data-id');
    console.log("Train Id: " + trainId);
    this.database.ref('/' + this.trains[trainId].key).remove();
    this.trains[trainId].deleted = true;
    trainRow.remove();
  }

};

var app;

$(document).ready(function() {
  // Launch the App
  app = new App();
});




