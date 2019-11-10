import * as React from "react";
import { Question } from "../../types/Questions";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faCircle, faMinusCircle, faUndoAlt } from "@fortawesome/free-solid-svg-icons";
import { faSquare } from "@fortawesome/free-regular-svg-icons"
import { IconButton, Fab, Icon } from '@material-ui/core';

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
const voteUpHandler = () => {
  voteUp();
  moveNext();
}

const voteDownHandler = () => {
  voteDown();
  moveNext();
}

  return (
    <div className="Controls">
        <IconButton>    
          <span className="fa-stack DownVote">
            <FontAwesomeIcon onClick={moveBack} icon={faCircle} size="lg" color="#f8f854" transform="left-0"/>
            <FontAwesomeIcon icon={faUndoAlt} size="xs" color="grey" transform="right-1 up-28"/>
          </span>
        </IconButton>
        <Fab  style={{margin: "5px"}} onClick={voteDownHandler}>
          <IconButton>    
            <span className="fa-stack DownVote">
              <FontAwesomeIcon icon={faSquare} size="lg" transform="right-2"/>
              <FontAwesomeIcon icon={faCircle} size="sm" color="grey" transform="left-10 up-24"/>
              <FontAwesomeIcon icon={faMinusCircle} size="xs" color="#ffcccb" transform="left-11.25 up-53.25 "/>
            </span>
          </IconButton>
        </Fab>
        <Fab style={{margin: "5px"}} onClick={voteUpHandler}>
          <IconButton>
            <span className="fa-stack DownVote">
              <FontAwesomeIcon icon={faSquare} size="lg" transform="left-2"/>
              <FontAwesomeIcon icon={faCircle} size="sm" color="grey" transform="right-9.5 up-24"/>
              <FontAwesomeIcon icon={faPlusCircle} size="xs" color="#bcf5bc" transform="right-11.5 up-53.25"/>
            </span>
          </IconButton>
        </Fab>
    </div>
  );
};

export default Controls;
