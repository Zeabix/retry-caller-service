const express = require('express');
const axios = require('axios')
const retry = require('retry');
require('log-timestamp');

const port = process.env.PORT || 3000;
const upstreamHost = process.env.UPSTREAM_HOST || 'http://localhost:3000'
const upstreamAPI = upstreamHost + '/profiles/';
const app = express();


app.get('/test/:id', async (req, res)=> {
    try {
        const id = req.params.id;
        const data = await getDataWithRetries(id);
        console.log(`Data: ${JSON.stringify(data)}`);
        res.status(200).json(data);
    } catch(e){
        console.log(`Fail to get data, error: ${e.message}`);
        res.sendStatus(500);
    }
    
})

app.listen(port, ()=>{
    console.log(`Server is started at port ${port}`);
})


/**
 * Retry function
 */
function retryWithExponentialBackoff(operation, arg) {
    return new Promise((resolve, reject) => {
      const operationRetry = retry.operation({
        retries: 5,
        factor: 3,
        minTimeout: 1 * 1000,
        maxTimeout: 60 * 1000,
        randomize: true,
      });
  
      operationRetry.attempt(() => {
        operation(arg)
          .then((result) => {
            resolve(result)
          })
          .catch((err) => {
            if (operationRetry.retry(err)) {
              return
            }
            reject(operationRetry.mainError())
          })
      })
    })
}

async function makeProfileRequest(id){
    try{
        var url = upstreamAPI + id;
        const response = await axios.get(url)
        return response.data
    } catch(e){
        console.log(`Error: ${e.message}`);
        throw e;
    }
}
async function getDataWithRetries(id) {
    try {
        const data = await retryWithExponentialBackoff(makeProfileRequest, id)
        return data;
    } catch (error) {
        console.log(`Failed to get data: ${error.message}`)
        throw error;
    }
  }