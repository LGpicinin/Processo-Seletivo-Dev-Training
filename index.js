import Student from './src/Student.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = join(cwd(), 'token.json');
const CREDENTIALS_PATH = join(cwd(), 'credentials.json');
const SPREADSHEET_ID = '1SVpmjx7ElYpOA7Xrgx26VeRo6zRplvI6Xe9f57KKkhE';

/**
 * Reads previously authorized credentials from the save file.
 *
 @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);

    console.log(`${Date ()} : Load saved credentials to use Google APIs`);

    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);

  console.log(`${Date ()} : Save credential to use Google APIs`);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {

  console.log(`${Date ()} : Request authorization to call Google APIs`);

  let client = await loadSavedCredentialsIfExist();
  if (client) {
    console.log(`${Date ()} : Get authorization to call Google APIs`);
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }

  console.log(`${Date ()} : Get authorization to call Google APIs`);

  return client;
}


/*
  * Calculate students situation (reproved by note, reproved by note,
  * aproved or final exam). If situation is final exam, then calculate
  * the note to final aprovation. 
*/

function calculateStudentsSituation(students){
  const totalClasses = 60;
  const maxFouls = totalClasses*0.25;
  var i = 0;
  var student = students[i];

  while(i < students.length){
    if(student.fouls > maxFouls){
      student.finalSituation = 'Reprovado por Falta';
    }
    else if(student.media >= 70){
      student.finalSituation = 'Aprovado';
    }
    else if(student.media >= 50){
      student.finalSituation = 'Exame Final';

      student.noteToFinalAprovation = 100 - student.media;
    }
    else{
      student.finalSituation = 'Reprovado por Nota';
    }

    i++;
    student = students[i];
  }
}


/*
  * Convert the array of students to a array of rows, but just
  * get the students finalSituation and noteToFinalAprovation. The
  * noteToFinalAprovation is converted to a string.
*/

function convertStudentsDataToRows(students){
  var rows = [];
  var i = 0;

  while(i < students.length){
    rows.push([students[i].finalSituation, students[i].noteToFinalAprovation.toString()])
    i++;
  }

  return rows;
}



/*
  * Get students columns Fouls, P1, P2 and P3. After, update
  * the columns Final Situation and Note for Final Aprovation
*/

async function getAndUpdateSheets(auth) {
  const sheets = google.sheets({version: 'v4', auth});

  console.log(`${Date ()} : Request values of spreadsheet`);
  

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'engenharia_de_software!C4:F27'
  });

  console.log(`${Date ()} : Get values of spreadsheet`);

  const rows = res.data.values;

  if (!rows || rows.length === 0) {
    console.log(`${Date ()} : No data found`);
    return;
  }

  var students = [];

  rows.forEach((row) => {
    students.push(new Student(parseInt(row[0]), parseInt(row[1]), parseInt(row[2]), parseInt(row[3])));
  }); //add students in same other that they came (row 4 to row 27)

  calculateStudentsSituation(students);

  const values = convertStudentsDataToRows(students);
  const range =  'engenharia_de_software!G4:H27'
  const valueInputOption =  'USER_ENTERED';

  console.log(`${Date ()} : Request to update values of spreadsheet`);

  try{
    sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: valueInputOption,
      resource: {
        values,
      },
    });

    console.log(`${Date ()} : Update values of spreadsheet`);

  } catch(err) {

    console.log(`${Date ()} : Failed to update values of spreadsheet`);
  }
  
}

authorize().then(getAndUpdateSheets).catch(console.error);