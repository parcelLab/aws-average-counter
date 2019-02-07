// dependencies

var os = require('os');
var _ = require('underscore');
var AWS = require('aws-sdk');
var CloudWatch;

var namespace = 'empty';

///////////////
// Prototype //
///////////////

function AverageCounter(name, pulse, isSilent) {

  // validate
  if (!(this instanceof AverageCounter)) return new AverageCounter('unnamed');
  if (!_.isString(name)) return console.error('Name must be a string');
  if (_.isUndefined(pulse)) pulse = 0;
  if (!_.isNumber(pulse) || _.isNaN(pulse) || pulse < 0)
    return console.error('Pulse must be positive integer');

  // set
  this.name = name;
  this.pulse = pulse;
  this.isSilent = isSilent;

  // init
  this.values = [];

  return this;
}

////////////////
// CloudWatch //
////////////////

/**
 * pretty-prints the result of the AverageCounter
 * @param  {String}  name           name of the AverageCounter
 * @param  {Number}  average        average count
 * @param  {Boolean} isAverageValue defines whether this is an average value
 */
function print(name, average) {
  var log = name + ' on ' + os.hostname() + ': ' + average;
  console.log(log);
}

/**
 * uploads a measurement to AWS CloudWatch
 * @param  {String} metric name of the metric
 * @param  {Number} value  value of the metric
 */
function uploadMetricToCloudWatch(metric, value) {

  var params = {
    MetricData: [
      {
        MetricName: metric,
        Timestamp: new Date(),
        Unit: 'Count',
        Value: value,
      },
    ],
    Namespace: 'AverageCounter/' + namespace,
  };

  CloudWatch.putMetricData(params, function (err) {
    if (err) console.error('Could not upload to CloudWatch: ', JSON.stringify(err));
  });

}

/////////////////////
// Pulse Functions //
/////////////////////

/**
 * regular functions which calculates overage over pulse interval
 * calls itself with defined pulse timeout
 */
AverageCounter.prototype.pushPulseToCloudWatch = function () {
  var _this = this;
  setTimeout(function () {

    // calc
    var average = null;
    if (_this.values && _.isArray(_this.values) && _this.values.length === 0) {
      average = _this.values.reduce((p, c) => p + c, 0) / _this.values.length;
    }

    // inform
    if (_this.values.length > 0) {
      if (!this.isSilent) print(_this.name, average);
      uploadMetricToCloudWatch(_this.name, average);
    }

    // reset
    _this.values = [];

    // do it again
    _this.pushPulseToCloudWatch();
  }, this.pulse * 1000);
};

//////////////////////
// Public Functions //
//////////////////////

/**
 * returns a AverageCounter object
 * @param  {String} name  the name of the AverageCounter
 * @param  {Number} pulse the pulse in seconds, is optional
 * @param  {Boolean} silent whether the AverageCounter should write to the log
 *                          (default false, any truthy value works)
 * @return {Object}         a AverageCounter
 */
function getAverageCounter(name, pulse, silent) {

  if (_.isUndefined(pulse)) pulse = 0;
  var writeResultsToLog = _.isUndefined(silent) || silent === false;

  var averageCounter = new AverageCounter(name, pulse, !writeResultsToLog);
  if (averageCounter.pulse > 0) averageCounter.pushPulseToCloudWatch();
  return averageCounter;

}

/**
 * counts
 */
AverageCounter.prototype.count = function (count) {
  if (!_.isNumber(count)) return null;
  this.values.push(count);
  return count;
};

////////////
// Export //
////////////

/**
 * on require AWS credentials are stored and the constructor method is returned
 * @param  {String} region AWS Credentials: Region of CloudWatch, defaults to 'eu-central-1'
 * @param  {String} key    AWS Credentials: Key
 * @param  {String} secret AWS Credentials: Token
 * @param  {String} ns     Namespace for all Metrics
 * @return {Object}        object with the constructor method startAverageCounter()
 */
module.exports = function (region, key, secret, ns) {

  if (_.isNull(region)) region = 'eu-central-1';

  AWS.config.region = region;
  AWS.config.accessKeyId = key;
  AWS.config.secretAccessKey = secret;

  CloudWatch = new AWS.CloudWatch();
  namespace = ns;
  return { getAverageCounter };

};
