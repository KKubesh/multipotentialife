import * as React from "react";
import { Question } from "../../types/Questions";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle,  } from "@fortawesome/free-solid-svg-icons";

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
    <div className="Controls">
        <button onClick={moveBack}>Back</button>
        <button onClick={voteDown}>Dislike</button>
        <span className="fa-stack fa-lg">
          <FontAwesomeIcon onClick={voteUp} icon={faPlusCircle} size="xs" />
          {/* <FontAwesomeIcon onClick={voteUp} icon={faSquare} size="lg" /> */}
        </span>
        <button onClick={moveNext}>Next</button>
    </div>
  );
};

export default Controls;
