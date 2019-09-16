require('dotenv').config();
const express = require('express');
const cors = require('express-cors');
const bodyParser = require('body-parser');
const port = process.env.PORT || 3001;
const app = express();
var AssistantV2 = require('ibm-watson/assistant/v2');

app.use(cors({
  allowedOrigins: ['localhost:3000']
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var service = new AssistantV2({
  iam_apikey: process.env.IAM_APIKEY,
  version: '2019-02-28',
});

const assistantId = process.env.ASSISTANT_ID;
let sessionId

const sendMessage = async (messageInput) => {
  try {
    const response = await service.message({
      assistant_id: assistantId,
      session_id: sessionId,
      input: messageInput
    });
    return processResponse(response);
  } catch (err) {
    throw Error(err.message);
  }
}

function processResponse(response) {
  if (response.output.generic) {
    if (response.output.generic.length > 0) {
      if (response.output.generic[0].response_type === 'text') {
        return response.output.generic[0].text;
      }
    }
  }
}

app.post('/api/message', async (req, res) => {
  const { newMessage } = req.body;
  if (!newMessage) {
    return res.status(422).json({ message: `You are missing a required parameter of newMessage.` });
  }

  try {
    const message = await sendMessage({ message_type: 'text', text: newMessage });
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post('/api/v1/start_session', async (req, res) => {
  const { feeling } = req.body;
  if (!feeling) {
    return res.status(422).json({ message: "You are missing a required parameter of feeling."})
  }

  try {
    const session = await service.createSession({ assistant_id: assistantId });
    sessionId = session.session_id;
    const message = await sendMessage({ message_type: 'text', text: feeling });
    res.status(200).json({ message });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get('/api/v1/end_session', async (req, res) => {
  try {
    await service.deleteSession({ assistant_id: assistantId, session_id: sessionId });
    return res.sendStatus(204);
  } catch (err) {
    res.status(500).json(err);
  }
})

app.listen(port, () => {
  console.log(`Survey Bot is now running on ${port}!`);
});

