Consult `demo.js`:

```
var AWSAverageCounter = require('./index.js')('eu-central-1', 'AWS-KEY', 'AWS-SECRET', 'namespace');

var AverageCounter = AWSAverageCounter.getAverageCounter('my-counter', 300);

AverageCounter.count(1612);
```