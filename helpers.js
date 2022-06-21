import fs from 'fs'

export const fileContains = (fileLocation, searchString) => {
    fs.readFile(fileLocation, function (err, data) {
        if (err) throw err;
        if(data.indexOf(searchString) >= 0){
            return true;
        }
        return false;
      });
}
