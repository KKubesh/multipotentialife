import * as React from "react";
import { Question } from "../types/Questions";

type QuestionProps = {
    questionData: Question,
};

const QuestionContainer: React.FunctionComponent<QuestionProps> = ({
    questionData
}) => {
    return (
        <div className="Question">
            {`This is the question ${questionData.question}, raiting: ${questionData.rating}`}
        </div>
    );
};

export default QuestionContainer;
