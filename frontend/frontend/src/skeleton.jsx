import './App.css'
function SkeletonCard() {
  return (
    <div className="skeleton-card">

      <div
        className="skeleton"
        style={{
          height: "30px",
          width: "80%",
          marginBottom: "20px"
        }}
      />

      <div
        className="skeleton"
        style={{
          height: "20px",
          width: "100%",
          marginBottom: "10px"
        }}
      />

      <div
        className="skeleton"
        style={{
          height: "20px",
          width: "60%",
          marginBottom: "10px"
        }}
      />

      <div
        className="skeleton"
        style={{
          height: "100px",
          width: "100%"
        }}
      />

    </div>
  );
}

export default SkeletonCard;