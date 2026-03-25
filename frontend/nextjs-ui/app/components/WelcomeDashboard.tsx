import authFetch from '../api/authentication/authFetch';

type WelcomeDashboardProps = {
  username: string;
};

function WelcomeDashboard({ username }: WelcomeDashboardProps) {
  const handleDemo = async () => {
    const response = await authFetch.get("/demo");
    console.log(response.data);
  };

  return (
    <div>
      <h1>Welcome, {username}</h1>
      <button onClick={handleDemo}>Run Demo</button>
    </div>
  );
}

export default WelcomeDashboard;