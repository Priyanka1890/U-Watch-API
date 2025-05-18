export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">U-Watch API Documentation</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>

        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">User Profiles</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="font-mono mb-2">POST /api/users</p>
            <p className="text-sm mb-2">Create or update a user profile</p>
            <p className="text-sm mb-2">Required fields: userId</p>
            <p className="text-sm">Optional fields: name, sex, age, height, weight, medications</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-md mt-4">
            <p className="font-mono mb-2">GET /api/users?userId=123</p>
            <p className="text-sm">Retrieve a user profile by userId</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">Health Data</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="font-mono mb-2">POST /api/health-data</p>
            <p className="text-sm mb-2">Store health data for a user</p>
            <p className="text-sm mb-2">Required fields: userId</p>
            <p className="text-sm">
              Optional fields: timestamp, heartRate, oxygenSaturation, activityLevel, steps, distance, caloriesBurned,
              bloodPressureSystolic, bloodPressureDiastolic, bodyTemperature, environmentType, motionType, locationName
            </p>
          </div>

          <div className="bg-gray-100 p-4 rounded-md mt-4">
            <p className="font-mono mb-2">GET /api/health-data?userId=123&limit=10</p>
            <p className="text-sm">Retrieve health data for a user</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">Menstrual Tracking</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="font-mono mb-2">POST /api/menstrual-data</p>
            <p className="text-sm mb-2">Store menstrual tracking data for a user</p>
            <p className="text-sm mb-2">Required fields: userId</p>
            <p className="text-sm">Optional fields: cycleDate, flowLevel, symptoms, mood, notes</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-md mt-4">
            <p className="font-mono mb-2">GET /api/menstrual-data?userId=123&limit=10</p>
            <p className="text-sm">Retrieve menstrual tracking data for a user</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">Questionnaire Data</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="font-mono mb-2">POST /api/questionnaire-data</p>
            <p className="text-sm mb-2">Store questionnaire responses for a user</p>
            <p className="text-sm mb-2">Required fields: userId</p>
            <p className="text-sm">
              Optional fields: timestamp, energyLevel, stressLevel, sleepQuality, headache, musclePain, dizziness,
              nausea, notes
            </p>
          </div>

          <div className="bg-gray-100 p-4 rounded-md mt-4">
            <p className="font-mono mb-2">GET /api/questionnaire-data?userId=123&limit=10</p>
            <p className="text-sm">Retrieve questionnaire responses for a user</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">Offline Sync</h3>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="font-mono mb-2">POST /api/sync</p>
            <p className="text-sm mb-2">Synchronize offline data</p>
            <p className="text-sm">Required fields: userId, queueItems (array of {"{tableName, data}"} objects)</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
        <p className="mb-2">This API uses simple API key authentication.</p>
        <p>Include your API key in the request headers:</p>
        <pre className="bg-gray-100 p-4 rounded-md mt-2">{`X-API-Key: your-api-key-here`}</pre>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Error Handling</h2>
        <p className="mb-2">All endpoints return JSON responses with the following structure:</p>
        <pre className="bg-gray-100 p-4 rounded-md mt-2">
          {`// Success response
{
  "success": true,
  "data": [...]
}

// Error response
{
  "error": "Error message"
}`}
        </pre>
      </div>
    </div>
  )
}
