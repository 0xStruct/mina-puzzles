import React from 'react';
import Quiz from 'react-quiz-component';

// some style params
let grey = '#cccccc';
let darkGrey = '#999999';
let lightGrey = '#f6f6f6';
let thick = 'black solid 4px';
let thin = `${grey} solid 1px`;
let puzzleWidth = 450;
let rightColumnWidth = 275;

const quiz =  {
  "quizTitle": "Mina Puzzles - Quiz",
  "quizSynopsis": "How well do you know about Mina? Answer these questions",
  "nrOfQuestions": "3",
  "questions": [
    {
      "question": "What was the old name of Mina's o1js library?",
      "questionType": "text",
      //"questionPic": "https://dummyimage.com/600x400/000/fff&text=X", // if you need to display Picture in Question
      "answerSelectionType": "single",
      "answers": [
        "SnackJS",
        "SnarkJS",
        "SnarkyJS",
        "SnakeJS"
      ],
      "correctAnswer": "3",
      "messageForCorrectAnswer": "Correct answer. Good job.",
      "messageForIncorrectAnswer": "Incorrect answer. Please try again.",
      "explanation": "",
      "point": "10"
    },
    {
      "question": "Which hash function is primarily used for its ZK Proof in o1js?",
      "questionType": "text",
      "answerSelectionType": "single",
      "answers": [
        "SHA256",
        "MD5",
        "ZkHash",
        "Poseidon"
      ],
      "correctAnswer": "4",
      "messageForCorrectAnswer": "Correct answer. Good job.",
      "messageForIncorrectAnswer": "Incorrect answer. Please try again.",
      "explanation": "",
      "point": "10"
    },
    {
      "question": "Which is the name of Mina's very own ZK proof system which is a variation of PLONK?",
      "questionType": "text",
      "answerSelectionType": "single",
      "answers": [
        "Kimchi",
        "Sushi",
        "Nancho",
        "Zucchini"
      ],
      "correctAnswer": "1",
      "messageForCorrectAnswer": "Correct answer. Good job.",
      "messageForIncorrectAnswer": "Incorrect answer. Please try again.",
      "explanation": "",
      "point": "10"
    }
  ]
} 

export default function Quizzes({ solution, setSolution }) {
  
  return (
    <Quiz quiz={quiz} />
  );
}
