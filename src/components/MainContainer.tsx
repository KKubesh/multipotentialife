import * as React from "react";
import QuestionContainer from "./QuestionContainer";
import Controls from "./Controls/Controls";
import { Question } from "../types/Questions";
import { Card } from "@material-ui/core";
import '../App.css';

const questionArray = [{question: "Question01", rating: 17}, {question: "Question02", rating: 4}, {question: "Question03", rating: -1}, {question: "Question04", rating: 8}, {question: "Question05", rating: 2}, {question: "Question06", rating: 6}, {question: "Question07", rating: -4}, {question: "Question08", rating: 28}, {question: "Question09", rating: 0}]

const MainContainer: React.FunctionComponent = () => {

  const [questionData, setQuestionData] = React.useState<Question>({
    question: "",
    rating: 0,
  });

  const [qIndex, setQIndex] = React.useState(0);

  const moveBack = () => {
    if (qIndex !== 0) {
      const newIndex = qIndex - 1;
      setQIndex(newIndex);
      setQuestionData(questionArray[newIndex]);
    }
  }

  const voteDown = () => {
    questionData.rating -= 1;
    setQuestionData({question: questionData.question, rating: questionData.rating})
  }

  const voteUp = () => {
    questionData.rating += 1;
    setQuestionData({question: questionData.question, rating: questionData.rating})
  }

  const moveNext = () => {
    if (qIndex !== questionArray.length-1) {
      const newIndex = qIndex + 1;
      setQIndex(newIndex);
      setQuestionData(questionArray[newIndex]);
    }
  }

  React.useEffect(() => {
    setQuestionData(questionArray[qIndex]);
  }, []);


  return (
    <Card className="MainContainer">
      <QuestionContainer questionData={questionData}/>
      <Controls moveBack={moveBack} voteDown={voteDown} voteUp={voteUp} moveNext={moveNext} qIndex={qIndex} questionArray={questionArray} question={questionData} />
    </Card>
  );
};

export default MainContainer;
