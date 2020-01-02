import styled from 'styled-components';
import { Button } from 'semantic-ui-react';
import { Main } from '../components/Main';

const StyledContainer = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Home = () => (
  <StyledContainer>
    <Main />
  </StyledContainer>
);
export default Home;
