const app = require('./app')

const port = 3000;
app.listen(port, function () {
    console.log(`Server started on port ${port}`);
})