import * as React from "react";
import { Question } from "../../types/Questions";

type ConrtolProps = {
  moveBack: () => void;
  voteDown: () => void;
  voteUp: () => void;
  moveNext: () => void;
  qIndex: number;
  questionArray: Question[];
  question: Question;
};

const Controls: React.FunctionComponent<ConrtolProps> = ({
  moveBack,
  voteDown,
  voteUp,
  moveNext,
  questionArray,
  question,
}) => {
console.log(questionArray);

  return (
    <div>
        <button onClick={moveBack}>Back</button>
        <button onClick={voteDown}>Dislike</button>
        <button onClick={voteUp}>Like</button>
        <button onClick={moveNext}>Next</button>

        
    </div>
  );
};

export default Controls;
