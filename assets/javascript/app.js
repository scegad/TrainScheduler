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

    // Have we initialized and loaded data already?
    this.isAppInitialized = false;

    // Bind event handlers, so they can get at the goods with ".this"
    this._onNewTrainSubmit = this._onNewTrainSubmit.bind(this);
    this._onInitialDataLoad = this._onInitialDataLoad.bind(this);
    this._onNewTrainAdded = this._onNewTrainAdded.bind(this);

    // Arm event handlers
    this.dom.newTrainForm.on('submit', this._onNewTrainSubmit);
    this.database.ref().once('value', this._onInitialDataLoad, 
      (err) => { console.log(err) });
    this.database.ref().orderByChild("dateAdded").limitToLast(1).on("child_added", this._onNewTrainAdded, 
      (err) => { console.log(err) });

  }

  getNextDeparture(startTimeMoment, curTimeMoment, freqMoment) {
    return moment().add(moment(99, 'minutes'));
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
    let scheduleTbl = this.dom.scheduleTbl;
    let getNextDeparture = this.getNextDeparture;
    let currentTime = moment();

    $.each(trainData, function(index,value) {
      let train = trainData[index];
      let startHour = train.startTime.split(':')[0];
      let startMin = train.startTime.split(':')[1];
      let startTime = moment().hour(startHour).minute(startMin).second(0).format();

      let nextDeparture = getNextDeparture(startTime, currentTime, train.freq);

      var newRow = $(
        "<tr><td>" + 
        train.name + 
        "</td><td>" +
        train.dest +
        "</td><td>" +
        train.freq +
        "</td><td>" +
        nextDeparture.format('MMMM Do YYYY, h:mm:ss a') +
        "</td><td>" +
        nextDeparture.diff(currentTime, 'minutes', true) +
        "</td></tr>");
      scheduleTbl.append(newRow);
    });
    this.isAppInitialized = true;
  }

  _onNewTrainAdded(snapshot) {
    if (this.isAppInitialized) {
      console.log("New train added: " + snapshot.val());
    };
  }

};

var app;

$(document).ready(function() {
  // Launch the App
  app = new App();
});

/*


  


**/


