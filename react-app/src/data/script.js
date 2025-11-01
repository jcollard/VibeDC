// STEP 1: Create your quiz data as JSON objects
// TODO: Create a variable called quizData that is an array of objects
// Each object should have:
//   - question: a string with the question text
//   - answers: an array of 4 possible answers
//   - correctAnswer: the index (0-3) of the correct answer

let quizData = [
    // Add your first question here as an example:
    {
         question: "Who is Yami Yugi?",
         answers: ["Alter ego Yugi", "Brother of Yugi", "Archeologist", "Just Yugi"],
         correctAnswer: 0
    },

    {
         question: "Who is Pegasus?",
         answers: ["Creator of Duel Monsters", "Yugi's Dad", "Kaiba's Uncle", "Joey's brother"],
         correctAnswer: 1
    },

    {
         question: "How many Blue Eyes white dragon are there?",
         answers: ["5", "2", "3", "1"],
         correctAnswer: 3
    }
];

// STEP 2: Create variables to track the quiz state
let currentQuestion = 0;
let score = 0;

// STEP 3: Create the startQuiz function
function startQuiz() {
    // TODO: Reset currentQuestion to 0
    currentQuestion = 0;
    // TODO: Reset score to 0
    score = 0;
    // TODO: Show the quiz area and hide the results
    document.getElementById("quiz-area").classList.remove("hidden");
    // TODO: Call the showQuestion function
    showQuestion();
}

// STEP 4: Create the showQuestion function
function showQuestion() {
    // TODO: Get the current question object from quizData
    let question = quizData[currentQuestion];

    // TODO: Display the question text in the element with id "question-text"
    document.getElementById("question-text").textContent = 
        "Question" + (currentQuestion + 1) + ":" + question.question;

    // TODO: Set the text of answer1 button to question.answers[0]
    document.getElementById("answer1").textContent = question.answers[0];
    // TODO: Set the text of answer2 button to question.answers[1]
    document.getElementById("answer2").textContent = question.answers[1];
    // TODO: Set the text of answer3 button to question.answers[2]
    document.getElementById("answer3").textContent = question.answers[2];
    // TODO: Set the text of answer4 button to question.answers[3]
    document.getElementById("answer4").textContent = question.answers[3];

    // TODO: Enable all 4 buttons (set disabled to false)
    document.getElementById("answer1").disabled = false;
    document.getElementById("answer2").disabled = false;
    document.getElementById("answer3").disabled = false;
    document.getElementById("answer4").disabled = false;
    // TODO: Reset the class of all 4 buttons to "answer-button"
    document.getElementById("answer1").className = "answer-button";
    document.getElementById("answer2").className = "answer-button";
    document.getElementById("answer3").className = "answer-button";
    document.getElementById("answer4").className = "answer-button";
    // TODO: Hide the feedback and next button
    document.getElementById("feedback").classList.add("hidden")
    document.getElementById("next-button").classList.add("hidden");
}

// STEP 5: Create the checkAnswer function
// answerIndex is the number (0, 1, 2, or 3) of the button clicked
function checkAnswer(answerIndex) {
    // TODO: Get the current question object
    let question = quizData[currentQuestion];
    // TODO: Get the feedback element
    let feedbackElement = document.getElementById("feedback");
    // TODO: Disable all 4 answer buttons
    document.getElementById("answer1").disabled = true;
    document.getElementById("answer2").disabled = true;
    document.getElementById("answer3").disabled = true;
    document.getElementById("answer4").disabled = true;
    // TODO: Check if answerIndex equals question.correctAnswer
    // If correct:
    if (answerIndex === question.correctAnswer) {
        let correctButtonId = "answer" + (answerIndex + 1);
        document.getElementById(correctButtonId).classList.add("correct");
        feedbackElement.textContent = "Correct! Well done!";
        feedbackElement.className = "correct";
        score = score + 1;
    }
    //   - Find the correct button ID ("answer1", "answer2", etc.)
    else {
        let wrongButtonId = "answer" + (answerIndex + 1);
        let correctButtonId = "answer" + (question.correctAnswer + 1);
        document.getElementById(wrongButtonId).classList.add("incorrect");
        document.getElementById(correctButtonId).classList.add("correct");
        feedbackElement.textContent = "Incorrect. The answer is:" + question.answers[question.correctAnswer];
        feedbackElement.className = "incorrect";
    }
    //   - Add "correct" class to that button
    //   - Show success message in feedback
    //   - Add 1 to the score
    // If incorrect:
    //   - Find the wrong button ID and add "incorrect" class
    //   - Find the correct button ID and add "correct" class
    //   - Show the correct answer in feedback

    // TODO: Show the feedback and next button
    feedbackElement.classList.remove("hidden");
    document.getElementById("next-button").classList.remove("hidden");
}

// STEP 6: Create the nextQuestion function
function nextQuestion() {
    // TODO: Add 1 to currentQuestion
    currentQuestion = currentQuestion + 1;
    // TODO: Check if there are more questions
    if (currentQuestion < quizData.length) {
        showQuestion();
    } 
    else {
        showResults();
    }
    // If yes: call showQuestion()
    // If no: call showResults()
}


// STEP 7: Create the showResults function
function showResults() {
    // TODO: Hide the quiz area
    document.getElementById("quiz-area").classList.add("hidden");
    // TODO: Show the results container
    document.getElementById("results-container").classList.remove("hidden");
    // TODO: Calculate the percentage score
    let percentage = Math.round((score / quizData.length * 10));
    
    // TODO: Display the score in the score-text element
    document.getElementById("score-text"). textContent = 
        "You scored" + score + "out of" + quizData.length +
        "("+ percentage + "%)";
}

// CHALLENGE: Create the restartQuiz function
function restartQuiz() {
    // TODO: Call startQuiz to restart the quiz
}
