import * as React from "react";
import { Question } from "../types/Questions";
import Card from "../../node_modules/@material-ui/core/Card/Card"

type QuestionProps = {
    questionData: Question,
};

const QuestionContainer: React.FunctionComponent<QuestionProps> = ({
    questionData
}) => {
    return (
        <Card>
            {`This is the question ${questionData.question}, raiting: ${questionData.rating}`}
        </Card>
    );
};

export default QuestionContainer;
