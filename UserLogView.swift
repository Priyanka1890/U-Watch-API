import SwiftUI
import HealthKit
import CoreML
import Charts
import Foundation

// Add this after the imports
private let bodyDiagramImage = "body-diagram" // Reference to the image in Assets

struct UserLogView: View {
    // State variables for tracking questionnaire responses
    @State private var isSubmitting = false
    @State private var submitError: String? = nil
    @State private var showingSubmitSuccess = false
    @State private var showingSubmitError = false
    @State private var questionnaireSubmitted = false
    @State private var showingSettings = false
    @State private var showingContactSharingView = false
    
    // Questionnaire flow state
    @State private var showingWelcome = true
    @State private var currentQuestionnaireStep = 0
    @State private var questionnaireCompleted = false

    // Energy tracking with time slots
    @State private var energyLevelsAtTimes: [String: Int] = [:]
    @State private var showingEnergyGraph = false
    @State private var energyGraphPoints: [CGPoint] = []
    @State private var isDrawingOnGraph = false
    
    // New questionnaire responses
    @State private var refreshmentLevel: Double = 1.0
    @State private var hasExcessiveFatigue: Bool? = nil
    @State private var crashTimeOfDay: String = ""
    @State private var selectedBodyAreas: Set<String> = []
    @State private var selectedSymptoms: Set<String> = []
    @State private var otherSymptomsDescription: String = ""
    
    // Updated crash-related questions
    @State private var crashDuration: String = ""
    @State private var crashDurationNumber: Double = 1.0
    @State private var crashTrigger: Set<String> = []
    @State private var crashTriggerDescription: String = ""
    @State private var fatigueDate: Date = Date()
    @State private var fatigueDescription: String = ""
    
    @State private var selectedMainTrigger: String = ""
    @State private var selectedSubTriggers: Set<String> = []
    
    // Sleep assessment
    @State private var sleepQuality: String = "Fair"
    @State private var sleepDuration: Double = 0.0 // in hours
    @State private var sleepStages: [String: Double] = [:]
    @State private var sleepAssessment: String = ""
    @State private var healthKitAuthorized: Bool = false
    @State private var showingHealthKitAlert: Bool = false
    @State private var sleepQualitySlider: Double = 1.0
    
    // Energy graph data
    @State private var energyDataPoints: [EnergyDataPoint] = []
    @State private var selectedEnergyLevel: Int = 5
    @State private var showingEnergyPopover: Bool = false
    @State private var selectedTimePoint: Double = 12.0 // Default to noon
    @State private var isSubmittingEnergy: Bool = false
    
    // Checkbox states for crash time options
    @State private var isOption1Selected: Bool = false
    @State private var isOption2Selected: Bool = false
    
    // HealthKit manager
    private let healthStore = HKHealthStore()
    
    // Database and API connection status
    @StateObject private var apiChecker = APIConnectivityChecker.shared
    @State private var showingAPIAlert = false
    @StateObject private var syncManager = SyncManager.shared
    
    // Questionnaire manager
    @StateObject private var questionnaireManager = QuestionnaireManager.shared
    
    // Get user data
    @AppStorage("name") private var userName: String = "User"
    @AppStorage("userId") private var userId: String = UUID().uuidString

    @State private var wakeUpTime: Date = Date()
    @StateObject private var languageManager = LanguageManager.shared
    @State private var currentQuestionIndex = 0
    @State private var responses: [String: Any] = [:]
    @State private var showingNextQuestion = false
    
    @State private var crashTimeDate: Date = Date()
    @State private var wakeUpHour: Int = 8

    private var twentyFourHourFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateFormat = "HH:mm"
        return formatter
    }

    var body: some View {
        NavigationView {
            if showingWelcome && !questionnaireCompleted {
                welcomePageView
            } else if currentQuestionnaireStep > 0 && !questionnaireCompleted {
                questionnaireFlowView
            } else {
                mainUserLogView
            }
        }
        .onAppear {
            apiChecker.checkAPIConnectivity()
            checkQuestionnaireStatus()
            checkHealthKitAuthorization()
            loadEnergyData()
        }
        .alert("Submission Successful", isPresented: $showingSubmitSuccess) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Your daily questionnaire has been recorded. Thank you!")
        }
        .alert("Submission Error", isPresented: $showingSubmitError) {
            Button("OK", role: .cancel) { }
            Button("Retry") {
                Task {
                    await completeQuestionnaire()
                }
            }
        } message: {
            Text(submitError ?? "An unknown error occurred while saving your questionnaire.")
        }
        .alert("HealthKit Access", isPresented: $showingHealthKitAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Please allow access to Health data in Settings to get accurate sleep information.")
        }
        .alert(isPresented: $showingAPIAlert) {
            Alert(
                title: Text("Connection Required"),
                message: Text("Please check your internet connection."),
                dismissButton: .default(Text("OK"))
            )
        }
        .sheet(isPresented: $showingSettings) {
            QuestionnaireSettingsView()
        }
        .sheet(isPresented: $showingContactSharingView) {
            ContactSharingView()
                .presentationDetents([.medium, .large])
        }
    }
    
    // MARK: - Welcome Page View
    private var welcomePageView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // Welcome header
            VStack(spacing: 16) {
                Image(systemName: "heart.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                
                Text("Willkommen bei U-WaTCH!")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)
            }
            
            // Welcome message
            VStack(spacing: 16) {
                Text("Im Folgenden werden Ihnen einige Fragen zu Ihrem allgemeinen Gesundheitszustand gestellt.")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                
                Text("Bitte antworten Sie wahrheitsgemäß und lesen Sie die Fragen sorgfältig durch.")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                
                Text("Vielen Dank, dass Sie heute hier sind!")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.blue)
            }
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Start button
            Button(action: {
                showingWelcome = false
                currentQuestionnaireStep = 1
            }) {
                Text("Fragebogen starten")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.blue, Color.blue.opacity(0.8)]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(16)
                    .shadow(color: .blue.opacity(0.3), radius: 8, x: 0, y: 4)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
        .navigationTitle("")
        .navigationBarHidden(true)
    }

    // MARK: - Questionnaire Flow View
    private var questionnaireFlowView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Progress indicator
                HStack {
                    ForEach(1...totalSteps, id: \.self) { step in
                        Circle()
                            .fill(step <= currentQuestionnaireStep ? Color.blue : Color.gray.opacity(0.3))
                            .frame(width: 8, height: 8)
                        
                        if step < totalSteps {
                            Rectangle()
                                .fill(step < currentQuestionnaireStep ? Color.blue : Color.gray.opacity(0.3))
                                .frame(height: 2)
                        }
                    }
                }
                .padding(.horizontal, 40)
                .padding(.top, 20)
                
                // Current question content
                switch currentQuestionnaireStep {
                case 1:
                    refreshmentQuestionView  // Move this to first
                case 2:
                    energyGraphView         // Move this to second
                case 3:
                    fatigueQuestionView
                case 4:
                    if hasExcessiveFatigue == true {
                        crashTimeQuestionView
                    } else if hasExcessiveFatigue == false {
                        symptomChecklistView  // Skip body diagram, go directly to symptoms
                    } else {
                        EmptyView()
                    }
                case 5:
                    if hasExcessiveFatigue == true {
                        crashTimeSymptomsView  // NEW: Move symptoms to separate page for "Ja" path
                    } else if hasExcessiveFatigue == false {
                        otherSymptomsView  // Move other symptoms to step 5 for "Nein" path
                    } else {
                        EmptyView()
                    }
                case 6:
                    if hasExcessiveFatigue == true {
                        existingQuestionsView  // Move existing questions to step 6 for "Ja" path
                    } else {
                        EmptyView()
                    }
                case 7:
                    if hasExcessiveFatigue == true {
                        EmptyView()  // This will be handled by step 6 now
                    } else {
                        EmptyView()
                    }
                default:
                    EmptyView()
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 100)
        }
        .navigationTitle("Fragebogen")
        .navigationBarTitleDisplayMode(.inline)
        .overlay(alignment: .bottom) {
            questionnaireNavigationButtons
        }
    }

    // MARK: - Enhanced Energy Graph View
    private var energyGraphView: some View {
        VStack(spacing: 16) {
            // Graph header
            VStack(spacing: 12) {
                Text("Zeichnen Sie Ihren Energieverlauf für \(getCurrentDayInGerman()) ein")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 20)
            
            // Full screen interactive drawing canvas
            VStack(spacing: 12) {
                // Drawing area with enhanced grid
                ZStack {
                    // Background grid with percentage intervals
                    Canvas { context, size in
                        // Horizontal grid lines (percentage levels: 0%, 25%, 50%, 75%, 100%)
                        for i in 0...4 {
                            let y = CGFloat(i) * (size.height / 4)
                            let isBaseline = i == 4 // Baseline (0%) is at bottom
                            
                            context.stroke(
                                Path { path in
                                    path.move(to: CGPoint(x: 0, y: y))
                                    path.addLine(to: CGPoint(x: size.width, y: y))
                                },
                                with: .color(isBaseline ? .red : .gray.opacity(0.3)),
                                lineWidth: isBaseline ? 3 : 1
                            )
                        }
                        
                        // Vertical grid lines based on wake-up time
                        let timeLabels = generateTimeLabelsBasedOnWakeUp()
                        for i in 0..<timeLabels.count {
                            let x = CGFloat(i) * (size.width / CGFloat(timeLabels.count - 1))
                            context.stroke(
                                Path { path in
                                    path.move(to: CGPoint(x: x, y: 0))
                                    path.addLine(to: CGPoint(x: x, y: size.height))
                                },
                                with: .color(.gray.opacity(0.4)),
                                lineWidth: 1
                            )
                        }
                        
                        // Add percentage labels on the right side
                        let percentageLabels = [100, 75, 50, 25, 0]
                        let germanLabels = ["sehr viel         ", "", "", "", "sehr wenig            "]
                        for (index, percentage) in percentageLabels.enumerated() {
                            let y = CGFloat(index) * (size.height / 4)
                            let color: Color = percentage == 0 ? .red : (percentage == 100 ? .green : .gray)
                            
                            // Draw percentage labels for 25%, 50%, 75% only (skip 0% and 100%)
                            if percentage != 0 && percentage != 100 {
                                context.draw(Text("\(percentage)%")
                                    .font(.caption)
                                    .fontWeight(.regular)
                                    .foregroundColor(color),
                                    at: CGPoint(x: size.width - 25, y: y + 15))
                            }
                            
                            // Draw German labels for 100% and 0% at extreme right
                            if percentage == 100 {
                                // Move "sehr viel" to extreme right
                                context.draw(Text(germanLabels[index])
                                    .font(.caption2)
                                    .foregroundColor(color),
                                    at: CGPoint(x: size.width - 10, y: y + 15))
                            } else if percentage == 0 {
                                // Move "sehr wenig" to extreme right and down a little bit
                                context.draw(Text(germanLabels[index])
                                    .font(.caption2)
                                    .foregroundColor(color),
                                    at: CGPoint(x: size.width - 10, y: y - 15))
                            }
                        }
                    }
                    .frame(height: 250) // Fixed height instead of percentage
                    
                    // Background gradient for energy zones
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: Color.green.opacity(0.3), location: 0.0),    // 100% - darker green
                            .init(color: Color.green.opacity(0.15), location: 0.25),  // 75%
                            .init(color: Color.gray.opacity(0.2), location: 0.5),     // 50% - gray instead of yellow
                            .init(color: Color.gray.opacity(0.1), location: 0.75),    // 25%
                            .init(color: Color.red.opacity(0.3), location: 1.0)       // 0% - darker red
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: 250)
                    
                    // User drawn energy curve
                    Canvas { context, size in
                        if energyGraphPoints.count > 1 {
                            var path = Path()
                            
                            // Convert first point to canvas coordinates
                            let firstCanvasPoint = convertToFullScreenCanvasPoint(energyGraphPoints[0], canvasSize: size)
                            path.move(to: firstCanvasPoint)
                            
                            // Create smooth sine wave curve
                            for i in 1..<energyGraphPoints.count {
                                let currentPoint = convertToFullScreenCanvasPoint(energyGraphPoints[i], canvasSize: size)
                                let previousPoint = convertToFullScreenCanvasPoint(energyGraphPoints[i-1], canvasSize: size)
                                
                                // Add smooth curve between points
                                let controlPoint1 = CGPoint(
                                    x: previousPoint.x + (currentPoint.x - previousPoint.x) * 0.3,
                                    y: previousPoint.y
                                )
                                let controlPoint2 = CGPoint(
                                    x: previousPoint.x + (currentPoint.x - previousPoint.x) * 0.7,
                                    y: currentPoint.y
                                )
                                
                                path.addCurve(to: currentPoint, control1: controlPoint1, control2: controlPoint2)
                            }
                            
                            // Draw the blue energy curve
                            context.stroke(path, with: .color(.blue), style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
                            
                            // Add glow effect
                            context.stroke(path, with: .color(.blue.opacity(0.3)), style: StrokeStyle(lineWidth: 8, lineCap: .round, lineJoin: .round))
                        }
                    }
                    .frame(height: 250)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in
                                let canvasHeight: CGFloat = 250
                                let canvasWidth = UIScreen.main.bounds.width - 80
                                
                                // Convert x position to time based on wake-up time
                                let timeLabels = generateTimeLabelsBasedOnWakeUp()
                                let timeIndex = (value.location.x / canvasWidth) * CGFloat(timeLabels.count - 1)
                                let clampedTimeIndex = max(0, min(CGFloat(timeLabels.count - 1), timeIndex))
                                
                                // Convert y position to percentage (0% to 100%)
                                let percentage = 100 - ((value.location.y / canvasHeight) * 100)
                                let clampedPercentage = max(0, min(100, percentage))
                                
                                let point = CGPoint(x: Double(clampedTimeIndex), y: clampedPercentage)
                                
                                if !isDrawingOnGraph {
                                    isDrawingOnGraph = true
                                    energyGraphPoints = [point]
                                } else {
                                    // Only add point if it's significantly different
                                    if let lastPoint = energyGraphPoints.last,
                                       abs(lastPoint.x - point.x) > 0.3 || abs(lastPoint.y - point.y) > 5 {
                                        energyGraphPoints.append(point)
                                    }
                                }
                            }
                            .onEnded { _ in
                                isDrawingOnGraph = false
                            }
                    )
                }
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                )
                
                // X-axis labels (time numbers based on wake-up time) - properly aligned with vertical lines
                GeometryReader { geometry in
                    let timeLabels = generateTimeLabelsBasedOnWakeUp()
                    ForEach(Array(timeLabels.enumerated()), id: \.offset) { index, time in
                        Text(time)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .fontWeight(.medium)
                            .position(
                                x: CGFloat(index) * (geometry.size.width / CGFloat(timeLabels.count - 1)),
                                y: 10
                            )
                    }
                }
                .frame(height: 20)
                .padding(.horizontal, 20)
                
                // German time period labels
                HStack {
                    Text("Morgens")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    Text("Mittags")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    Text("Abends")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fontWeight(.medium)
                }
                .padding(.horizontal, 40)

                // Energy level labels for 0% and 100%
                
                
                // Y-axis label
                Text("Uhrzeit")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .fontWeight(.medium)
                
                // Clear button
                Button("Clear Drawing") {
                    energyGraphPoints.removeAll()
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }
        }
        .padding(16)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Helper function to generate simple time labels (8, 10, 12, etc.)
    private func generateSimpleTimeLabels() -> [String] {
        var timeLabels: [String] = []
        
        // Generate time labels from 8 to 22 (every 2 hours)
        for hour in stride(from: 8, through: 22, by: 2) {
            timeLabels.append("\(hour)")
        }
        
        return timeLabels
    }

    // MARK: - Helper function to generate time labels based on user's wake-up time
    private func generateTimeLabelsBasedOnWakeUp() -> [String] {
        var timeLabels: [String] = []
        var currentHour = wakeUpHour
        
        // Generate 8 time labels (every 2 hours) starting from wake-up hour
        for _ in 0..<8 {
            timeLabels.append("\(currentHour)")
            currentHour += 2
            if currentHour >= 24 {
                currentHour -= 24
            }
        }
        
        return timeLabels
    }

    // MARK: - Helper function to generate time labels based on wake-up time
    private func generateTimeLabels() -> [String] {
        let calendar = Calendar.current
        let wakeUpHour = calendar.component(.hour, from: wakeUpTime)
        
        var timeLabels: [String] = []
        var currentHour = wakeUpHour
        
        // Generate time labels every 2 hours until 10 PM (22:00)
        while currentHour <= 22 {
            let formatter = DateFormatter()
            formatter.dateFormat = "ha"
            
            var components = DateComponents()
            components.hour = currentHour
            components.minute = 0
            
            if let time = calendar.date(from: components) {
                timeLabels.append(formatter.string(from: time).lowercased())
            }
            
            currentHour += 2
            
            // If we go past 22, break
            if currentHour > 22 {
                // Add 10 PM as the final label if not already included
                if !timeLabels.contains("10pm") {
                    timeLabels.append("10pm")
                }
                break
            }
        }
        
        return timeLabels
    }

    // MARK: - Helper function to convert time/percentage to full screen canvas coordinates
    private func convertToFullScreenCanvasPoint(_ point: CGPoint, canvasSize: CGSize) -> CGPoint {
        let timeLabels = generateTimeLabelsBasedOnWakeUp()
        
        // Convert time index (0 to timeLabels.count-1) to x position
        let normalizedTime = point.x / Double(timeLabels.count - 1)
        let x = normalizedTime * Double(canvasSize.width)
        
        // Convert percentage (0-100) to y position (inverted)
        let normalizedPercentage = point.y / 100
        let y = (1 - normalizedPercentage) * Double(canvasSize.height)
        
        return CGPoint(x: x, y: y)
    }

    // MARK: - Helper function to convert time/percentage to canvas coordinates (for summary view)
    private func convertToPercentageCanvasPoint(_ point: CGPoint, canvasSize: CGSize) -> CGPoint {
        let timeLabels = generateTimeLabelsBasedOnWakeUp()
        
        // Convert time index (0 to timeLabels.count-1) to x position
        let normalizedTime = point.x / Double(timeLabels.count - 1)
        let x = normalizedTime * Double(canvasSize.width)
        
        // Convert percentage (0-100) to y position (inverted)
        let normalizedPercentage = point.y / 100
        let y = (1 - normalizedPercentage) * Double(canvasSize.height)
        
        return CGPoint(x: x, y: y)
    }

    // MARK: - Refreshment Question View
    private var refreshmentQuestionView: some View {
        VStack(spacing: 24) {
            VStack(spacing: 12) {
                Text("Wie erholt haben Sie sich heute 30 Minuten nach dem Aufstehen gefühlt?")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
            }
            
            VStack(spacing: 20) {
                // Slider value display
                Text("\(Int(refreshmentLevel))")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(.blue)
            
                // Slider
                VStack(spacing: 8) {
                    Slider(value: $refreshmentLevel, in: 1...10, step: 1)
                        .accentColor(.blue)
                
                    // Scale labels
                    HStack {
                        VStack {
                            Text("1")
                                .font(.caption)
                                .fontWeight(.medium)
                            Text("Gar nicht erholt")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                    
                        Spacer()
                    
                        VStack {
                            Text("10")
                                .font(.caption)
                                .fontWeight(.medium)
                            Text("Sehr erholt")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                    }
                }
            }
            .padding(20)
            .background(Color(.systemGray6))
            .cornerRadius(12)

            // Wake-up time section - replace the existing DatePicker section with:
            VStack(spacing: 16) {
                Text("Wann sind Sie heute Morgen aufgewacht?")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                    .padding(.top, 20)

                // Hour-only picker - CHANGED FROM 5...12 TO 5...23
                VStack(spacing: 12) {
                    Picker("Wake-up Hour", selection: $wakeUpHour) {
                        ForEach(5...23, id: \.self) { hour in
                            Text("\(hour):00")
                                .tag(hour)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 120)
                    
                    // Display selected time
                    HStack {
                        Text("Selected time:")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("\(wakeUpHour):00")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.blue)
                    }
                    .padding(.horizontal, 16)
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(12)
        
            // Add sleep quality question section
            VStack(spacing: 16) {
                Text("Wie haben Sie letzte Nacht geschlafen?")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                    .padding(.top, 20)

                VStack(spacing: 20) {
                    // Slider value display
                    Text("\(Int(sleepQualitySlider))")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.blue)
                
                    // Slider
                    VStack(spacing: 8) {
                        Slider(value: $sleepQualitySlider, in: 1...10, step: 1)
                            .accentColor(.blue)
                    
                        // Scale labels
                        HStack {
                            VStack {
                                Text("1")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                Text("Sehr schlecht")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                        
                            Spacer()
                        
                            VStack {
                                Text("10")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                Text("Sehr gut")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                        }
                    }
                }
                .padding(20)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }

    // MARK: - Helper function for sleep stage colors
    private func sleepStageColor(for stage: String) -> Color {
        switch stage.lowercased() {
        case "deep":
            return .purple
        case "rem":
            return .orange
        case "core":
            return .blue
        case "light":
            return .green
        default:
            return .gray
        }
    }

    // MARK: - Fatigue Question View
    private var fatigueQuestionView: some View {
        VStack(spacing: 24) {
            // German text with red highlighting for "übermäßiger"
            VStack(spacing: 8) {
                (Text("Hatten Sie in den letzten 24 Stunden nach ")
                    .font(.title3)
                    .fontWeight(.semibold)
                + Text("geringster ")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.red)
                + Text("körperlicher, geistiger, sozialer oder emotionaler Anstrengung ein Gefühl von ")
                    .font(.title3)
                    .fontWeight(.semibold)
                 + Text ("übermäßiger")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.red)
                 + Text (" Erschöpfung oder eine Verschlechterung bestehender bzw. das Auftreten neuer Beschwerden erlebt?")
                    .font(.title3)
                    .fontWeight(.semibold))
                    .multilineTextAlignment(.center)
            }
            
            VStack(spacing: 16) {
                Button(action: { hasExcessiveFatigue = false }) {
                    HStack(spacing: 12) {
                        Image(systemName: hasExcessiveFatigue == false ? "checkmark.circle.fill" : "circle")
                            .font(.title2)
                            .foregroundColor(hasExcessiveFatigue == false ? .blue : .gray)
                        
                        Text("Nein")
                            .font(.headline)
                            .foregroundColor(hasExcessiveFatigue == false ? .blue : .primary)
                        
                        Spacer()
                    }
                    .padding(16)
                    .background(hasExcessiveFatigue == false ? Color.blue.opacity(0.1) : Color(.systemGray6))
                    .cornerRadius(12)
                }
                
                Button(action: { hasExcessiveFatigue = true }) {
                    HStack(spacing: 12) {
                        Image(systemName: hasExcessiveFatigue == true ? "checkmark.circle.fill" : "circle")
                            .font(.title2)
                            .foregroundColor(hasExcessiveFatigue == true ? .blue : .gray)
                        
                        Text("Ja")
                            .font(.headline)
                            .foregroundColor(hasExcessiveFatigue == true ? .blue : .primary)
                        
                        Spacer()
                    }
                    .padding(16)
                    .background(hasExcessiveFatigue == true ? Color.blue.opacity(0.1) : Color(.systemGray6))
                    .cornerRadius(12)
                }
            }
        }
    }

    // MARK: - Crash Time Question View
    private var crashTimeQuestionView: some View {
        VStack(spacing: 24) {
            // First section with the crash explanation text
            VStack(spacing: 12) {
                // New heading with blue text and red "Crash"
                (Text("Der in der vorherigen Frage beschriebene Zustand wird als ")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
                + Text("Crash ")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.red))
                + Text("bezeichnet")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
                    
            
            
            
        }
        
        // Crash explanation text moved to the middle
            VStack(spacing: 12) {
                // Second text below the heading
                Text("Wann haben Sie ungefähr den Crash bemerkt?")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
        
        }
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity)
        .multilineTextAlignment(.center)
        
        // Time picker for 24-hour format
        VStack(spacing: 16) {
            DatePicker("Crash Time", selection: $crashTimeDate, displayedComponents: .hourAndMinute)
                .datePickerStyle(.wheel)
                .labelsHidden()
                .frame(height: 120)
            
            // Display selected time in 24-hour format
            HStack {
                Text("Selected time:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
                Text(crashTimeDate, formatter: twentyFourHourFormatter)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
            }
            .padding(.horizontal, 16)
        }
        .padding(16)
        .background(Color(.systemGray6))
        .cornerRadius(12)
        
        // First checkbox option
        VStack(alignment: .leading, spacing: 12) {
            Button(action: {
                isOption1Selected.toggle()
                if isOption1Selected {
                    crashTimeOfDay = "kann ich nicht genau sagen, ich habe es gemerkt, nachdem ich aufgewacht bin"
                } else if !isOption2Selected {
                    crashTimeOfDay = ""
                }
            }) {
                HStack(spacing: 12) {
                    Image(systemName: isOption1Selected ? "checkmark.square.fill" : "square")
                        .font(.title3)
                        .foregroundColor(isOption1Selected ? .blue : .gray)
                    
                    Text("Kann ich nicht genau sagen, ich habe es gemerkt, nachdem ich aufgewacht bin")
                        .font(.subheadline)
                        .foregroundColor(isOption1Selected ? .blue : .primary)
                        .multilineTextAlignment(.leading)
                    
                    Spacer()
                }
                .padding(12)
                .background(isOption1Selected ? Color.blue.opacity(0.1) : Color(.systemGray6))
                .cornerRadius(8)
            }
        }
        
        // Second checkbox option
        VStack(alignment: .leading, spacing: 12) {
            Button(action: {
                isOption2Selected.toggle()
                if isOption2Selected {
                    crashTimeOfDay = "Kann ich nicht sagen"
                } else if !isOption1Selected {
                    crashTimeOfDay = ""
                }
            }) {
                HStack(spacing: 12) {
                    Image(systemName: isOption2Selected ? "checkmark.square.fill" : "square")
                        .font(.title3)
                        .foregroundColor(isOption2Selected ? .blue : .gray)
                    
                    Text("Kann ich nicht sagen")
                        .font(.subheadline)
                        .foregroundColor(isOption2Selected ? .blue : .primary)
                    
                    Spacer()
                }
                .padding(12)
                .background(isOption2Selected ? Color.blue.opacity(0.1) : Color(.systemGray6))
                .cornerRadius(8)
            }
        }
    }
}

// MARK: - Crash Time Symptoms View (Separate Page)
private var crashTimeSymptomsView: some View {
    VStack(spacing: 12) {
        Text("Bitte markieren Sie die heute vorliegenden Symptome")
            .font(.title3)
            .fontWeight(.semibold)
            .multilineTextAlignment(.center)
            .padding(.top, 20)
    
        VStack(spacing: 12) {
            ForEach(symptomOptions, id: \.self) { symptom in
                Button(action: { toggleSymptom(symptom) }) {
                    HStack(spacing: 12) {
                        Image(systemName: selectedSymptoms.contains(symptom) ? "checkmark.square.fill" : "square")
                            .font(.title3)
                            .foregroundColor(selectedSymptoms.contains(symptom) ? .blue : .gray)
                    
                        Text(symptom)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    
                        Spacer()
                    
                    }
                    .padding(12)
                    .background(selectedSymptoms.contains(symptom) ? Color.blue.opacity(0.1) : Color(.systemGray6))
                    .cornerRadius(8)
                }
            }
        }
    }
}

    // MARK: - Symptom Checklist View
    private var symptomChecklistView: some View {
        VStack(spacing: 24) {
            VStack(spacing: 12) {
                Text("Bitte markieren Sie die heute vorliegenden Symptome")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
            }
            
            VStack(spacing: 12) {
                ForEach(symptomOptions, id: \.self) { symptom in
                    Button(action: { toggleSymptom(symptom) }) {
                        HStack(spacing: 12) {
                            Image(systemName: selectedSymptoms.contains(symptom) ? "checkmark.square.fill" : "square")
                                .font(.title3)
                                .foregroundColor(selectedSymptoms.contains(symptom) ? .blue : .gray)
                            
                            Text(symptom)
                                .font(.subheadline)
                                .foregroundColor(.primary)
                            
                            Spacer()
                        }
                        .padding(12)
                        .background(selectedSymptoms.contains(symptom) ? Color.blue.opacity(0.1) : Color(.systemGray6))
                        .cornerRadius(8)
                    }
                }
            }
        }
    }

    // MARK: - Other Symptoms View
    private var otherSymptomsView: some View {
        VStack(spacing: 24) {
            VStack(spacing: 12) {
                Text("Falls andere Symptome aufgetreten sind, beschreiben Sie diese bitte kurz (Schweregrad, Dauer etc.)")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                TextEditor(text: $otherSymptomsDescription)
                    .frame(height: 120)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    .onChange(of: otherSymptomsDescription) { newValue in
                        if newValue.count > 500 {
                            otherSymptomsDescription = String(newValue.prefix(500))
                        }
                    }
                
                Text("\(otherSymptomsDescription.count)/1000 characters")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }

    // MARK: - Existing Questions View
    private var existingQuestionsView: some View {
        VStack(spacing: 24) {
            crashDurationQuestionSection
            crashDurationNumberSection
            crashTriggerQuestionSection
            crashTriggerDescriptionSection
        }
    }

    // MARK: - Crash Duration Question Section
    private var crashDurationQuestionSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            (Text("Welcher Zeitrahmen beschreibt die Dauer Ihres letzten ")
                .font(.headline)
                .fontWeight(.semibold)
            + Text("Crashs")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.red)
            + Text(" am besten ?")
                .font(.headline)
                .fontWeight(.semibold))
            
            VStack(spacing: 12) {
                ForEach(crashDurationOptions, id: \.self) { duration in
                    Button(action: { crashDuration = duration }) {
                        HStack(spacing: 12) {
                            Image(systemName: crashDuration == duration ? "checkmark.circle.fill" : "circle")
                                .font(.title3)
                                .foregroundColor(crashDuration == duration ? .blue : .gray)
                            
                            Text(duration)
                                .font(.subheadline)
                                .foregroundColor(crashDuration == duration ? .blue : .primary)
                            
                            Spacer()
                        }
                        .padding(12)
                        .background(crashDuration == duration ? Color.blue.opacity(0.1) : Color(.systemGray6))
                        .cornerRadius(8)
                    }
                }
            }
            
            // Date picker (if not "Keine dieser Antworten")
            if !crashDuration.isEmpty && crashDuration != "Keine dieser Antworten" {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Wann war der Crash?")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    DatePicker("Crash Datum", selection: $fatigueDate, in: Calendar.current.date(byAdding: .day, value: -30, to: Date())!...Date(), displayedComponents: .date)
                        .datePickerStyle(.compact)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .animation(.easeInOut(duration: 0.3), value: crashDuration)
    }

    // MARK: - Crash Duration Number Section
    private var crashDurationNumberSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(crashDurationNumberQuestionText)
                .font(.headline)
                .fontWeight(.semibold)
            
            if !crashDuration.isEmpty && crashDuration != "Keine dieser Antworten" && crashDuration != "Ich bin aktuell noch in einem Crash" {
                VStack(spacing: 20) {
                    // Slider value display
                    Text("\(Int(crashDurationNumber))")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.blue)
                    
                    // Slider
                    VStack(spacing: 8) {
                        Slider(value: $crashDurationNumber, in: 1...crashDurationMaxValue, step: 1)
                            .accentColor(.blue)
                        
                        // Scale labels
                        HStack {
                            Text("1")
                                .font(.caption)
                                .fontWeight(.medium)
                            
                            Spacer()
                            
                            Text("\(Int(crashDurationMaxValue))")
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                    }
                }
                .padding(20)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var KörperlicheAnstrengungSubOptions: [String] {
        return [
            "Gehen/Laufen",
            "Stehen",
            "Treppen steigen",
            "Sportliche Aktivität",
            "Einkaufen gehen",
            "Haushalt (Staubsaugen, Kochen, Putzen, etc.)",
            "Körperpflege (Duschen, Zähne putzen, etc.)",
            "Sexuelle Aktivität",
            "Gartenarbeit"
        ]
    }

    private var GeistigeAnstrengungSubOptions: [String] {
        return [
            "Lesen",
            "Schreiben",
            "Lernen",
            "Unterhalten",
            "Zuhören",
            "Nachdenken",
            "Autofahren",
            "Orientieren"
        ]
    }

    private var EmotionaleAnstrengungSubOptions: [String] {
        return [
            "Freude",
            "Wut",
            "Trauer",
            "Stress",
            "Angst",
            "Auseinandersetzung (Streit, Diskussion, etc.)",
            "Grübeln",
            "Belastende Situation/Zustand (z.B. Einsamkeit)",
            "Panik"
        ]
    }

    private var SozialeAnstrengungSubOptions: [String] {
        return [
            "Treffen mit Freunden/Familie",
            "Besuch im Kino, Theater, Restaurant oder ähnliches",
            "Menschenmengen"
        ]
    }

    private var ReizeSubOptions: [String] {
        return [
            "Geräusche/Lärm",
            "Visuelle Reize (Licht, Flackern, etc.)",
            "Geruch",
            "Vibration"
        ]
    }

    private func getSubOptionsFor(_ mainTrigger: String) -> [String] {
        switch mainTrigger {
        case let trigger where trigger.contains("Körperliche Anstrengung"):
            return KörperlicheAnstrengungSubOptions
        case let trigger where trigger.contains("Geistige Anstrengung"):
            return GeistigeAnstrengungSubOptions
        case let trigger where trigger.contains("Emotionale Anstrengung"):
            return EmotionaleAnstrengungSubOptions
        case let trigger where trigger.contains("SozialeAnstrengung"):
            return SozialeAnstrengungSubOptions
        case let trigger where trigger.contains("Reize"):
            return ReizeSubOptions
        default:
            return []
        }
    }

    private var crashTriggerOptions: [String] {
        return [
            "Körperliche Anstrengung ",
            "Geistige Anstrengung",
            "Emotionale Anstrengung",
            "Soziale Anstrengung",
            "Reize"
        ]
    }

    private var crashTriggerQuestionSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Welche der Auslöser können Sie Ihren letzten Crash zuschreiben?")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(spacing: 12) {
                ForEach(crashTriggerOptions, id: \.self) { trigger in
                    VStack(alignment: .leading, spacing: 8) {
                        Button(action: {
                            toggleMainCrashTrigger(trigger)
                        }) {
                            HStack(spacing: 12) {
                                Image(systemName: crashTrigger.contains(trigger) ? "checkmark.square.fill" : "square")
                                    .font(.title3)
                                    .foregroundColor(crashTrigger.contains(trigger) ? .blue : .gray)
                                
                                Text(trigger)
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                                
                                Spacer()
                            }
                            .padding(12)
                            .background(crashTrigger.contains(trigger) ? Color.blue.opacity(0.1) : Color(.systemGray6))
                            .cornerRadius(8)
                        }
                        
                        // Show sub-options if this main trigger is selected
                        if crashTrigger.contains(trigger) {
                            VStack(spacing: 8) {
                                ForEach(getSubOptionsFor(trigger), id: \.self) { subOption in
                                    Button(action: {
                                        toggleSubTrigger(subOption)
                                    }) {
                                        HStack(spacing: 8) {
                                            Image(systemName: selectedSubTriggers.contains(subOption) ? "checkmark.circle.fill" : "circle")
                                                .font(.body)
                                                .foregroundColor(selectedSubTriggers.contains(subOption) ? .blue : .gray)
                                            
                                            Text(subOption)
                                                .font(.caption)
                                                .foregroundColor(.primary)
                                            
                                            Spacer()
                                        }
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 6)
                                        .background(selectedSubTriggers.contains(subOption) ? Color.blue.opacity(0.05) : Color(.systemGray5))
                                        .cornerRadius(6)
                                    }
                                }
                            }
                            .padding(.leading, 20)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                        }
                    }
                    .animation(.easeInOut(duration: 0.2), value: crashTrigger.contains(trigger))
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private func toggleMainCrashTrigger(_ trigger: String) {
        if crashTrigger.contains(trigger) {
            crashTrigger.remove(trigger)
            // Remove all sub-triggers for this main trigger when deselecting
            let subOptions = getSubOptionsFor(trigger)
            for subOption in subOptions {
                selectedSubTriggers.remove(subOption)
            }
        } else {
            crashTrigger.insert(trigger)
        }
    }

    private func toggleSubTrigger(_ subTrigger: String) {
        if selectedSubTriggers.contains(subTrigger) {
            selectedSubTriggers.remove(subTrigger)
        } else {
            selectedSubTriggers.insert(subTrigger)
        }
    }

    // MARK: - Crash Trigger Description Section
    private var crashTriggerDescriptionSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Können Sie die genauen Auslöser für den Crash tiefergehend beschreiben? Gehen Sie zudem darauf ein, wie die Beschwerden sich für Sie angefühlt haben (plötzlich, langwierig, besonders stark etc. )")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(alignment: .leading, spacing: 8) {
                TextEditor(text: $crashTriggerDescription)
                    .frame(height: 120)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    .onChange(of: crashTriggerDescription) { newValue in
                        if newValue.count > 500 {
                            crashTriggerDescription = String(newValue.prefix(500))
                        }
                    }
                
                Text("\(crashTriggerDescription.count)/1000 characters")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - Enhanced Main User Log View with Complete Questionnaire Summary
    private var mainUserLogView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header with completion status
                headerWithCompletionStatus
                
                // Step-by-step questionnaire summary
                questionnaireStepsSummary
                
                // CIAS External Questionnaire Section
                externalQuestionnaireSection
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 100)
        }
        .navigationTitle("Tägliche Zusammenfassung")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Einstellungen") {
                    showingSettings = true
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Wiederholen") {
                    retakeQuestionnaire()
                }
                .foregroundColor(.blue)
            }
        }
    }

    // MARK: - Helper function to get current questionnaire number
    private func getCurrentQuestionnaireNumber() -> Int {
        let calendar = Calendar.current
        let today = Date()
        
        // Get the start date from UserDefaults or use a default start date
        let startDateKey = "questionnaireStartDate_\(UserIDManager.shared.getCurrentUserId())"
        
        let startDate: Date
        if let savedStartDate = UserDefaults.standard.object(forKey: startDateKey) as? Date {
            startDate = savedStartDate
        } else {
            // If no start date is saved, use today as the start date and save it
            startDate = calendar.startOfDay(for: today)
            UserDefaults.standard.set(startDate, forKey: startDateKey)
        }
        
        // Calculate the number of days since the start date
        let daysSinceStart = calendar.dateComponents([.day], from: startDate, to: calendar.startOfDay(for: today)).day ?? 0
        
        // Return the questionnaire number (day 0 = questionnaire 1, day 1 = questionnaire 2, etc.)
        // Cap at 180 days as mentioned
        return min(daysSinceStart + 1, 180)
    }

    // MARK: - Header with Completion Status
    private var headerWithCompletionStatus: some View {
        VStack(spacing: 16) {
            // Completion badge
            HStack {
                Image(systemName: "checkmark.seal.fill")
                    .font(.title)
                    .foregroundColor(.green)
            
                VStack(alignment: .leading, spacing: 4) {
                    Text("Super, Sie haben den \(getCurrentQuestionnaireNumber()). Fragebogen abgeschlossen")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                
                    Text("Heute um \(Date(), formatter: timeFormatter)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            
                Spacer()
            }
            .padding(20)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.green.opacity(0.1), Color.green.opacity(0.05)]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.green.opacity(0.3), lineWidth: 1)
            )
        
            // Welcome message with random motivational text
            Text(getRandomMotivationalText())
                .font(.title3)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
                .foregroundColor(.green)
        }
    }

    // MARK: - Questionnaire Steps Summary
    private var questionnaireStepsSummary: some View {
        VStack(spacing: 20) {
            // Section header
            HStack {
                Text("Ihre Antworten")
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
            }
            
            // Step 1: Refreshment & Feelings
            refreshmentSummaryCard

            // Step 2: Energy Pattern
            energySummaryCard

            // Step 3: Fatigue Assessment
            fatigueSummaryCard
            
            // Conditional steps based on fatigue response
            if hasExcessiveFatigue == true {
                crashTimeSummaryCard
                additionalHealthSummaryCard
            } else if hasExcessiveFatigue == false {
                symptomChecklistSummaryCard
                if !otherSymptomsDescription.isEmpty {
                    otherSymptomsSummaryCard
                }
            }
            
            // Show all detailed responses
            allResponsesSummaryCard
        }
    }

    // MARK: - Energy Summary Card
    private var energySummaryCard: some View {
        VStack(spacing: 16) {
            // Card header
            HStack {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.title2)
                    .foregroundColor(.blue)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Energie-Diagramm")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Schritt 2")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            // Energy graph visualization
            if !energyGraphPoints.isEmpty {
                VStack(spacing: 12) {
                    Text("Ihre Energie den ganzen Tag über")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    // Mini energy graph
                    Canvas { context, size in
                        if energyGraphPoints.count > 1 {
                            var path = Path()
                            
                            // Convert first point to canvas coordinates
                            let firstCanvasPoint = convertToPercentageCanvasPoint(energyGraphPoints[0], canvasSize: size)
                            path.move(to: firstCanvasPoint)
                            
                            // Create smooth curve
                            for i in 1..<energyGraphPoints.count {
                                let currentPoint = convertToPercentageCanvasPoint(energyGraphPoints[i], canvasSize: size)
                                let previousPoint = convertToPercentageCanvasPoint(energyGraphPoints[i-1], canvasSize: size)
                                
                                let controlPoint1 = CGPoint(
                                    x: previousPoint.x + (currentPoint.x - previousPoint.x) * 0.3,
                                    y: previousPoint.y
                                )
                                let controlPoint2 = CGPoint(
                                    x: previousPoint.x + (currentPoint.x - previousPoint.x) * 0.7,
                                    y: currentPoint.y
                                )
                                
                                path.addCurve(to: currentPoint, control1: controlPoint1, control2: controlPoint2)
                            }
                            
                            // Draw the energy curve
                            context.stroke(path, with: .color(.blue), style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                            
                            // Add gradient fill
                            var fillPath = path
                            fillPath.addLine(to: CGPoint(x: size.width, y: size.height))
                            fillPath.addLine(to: CGPoint(x: 0, y: size.height))
                            fillPath.closeSubpath()
                            
                            context.fill(fillPath, with: .linearGradient(
                                Gradient(colors: [.blue.opacity(0.3), .blue.opacity(0.1)]),
                                startPoint: CGPoint(x: 0, y: 0),
                                endPoint: CGPoint(x: 0, y: size.height)
                            ))
                        }
                    }
                    .frame(height: 100)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    
                    // Energy statistics
                    HStack(spacing: 20) {
                        VStack(spacing: 4) {
                            Text("\(Int(energyGraphPoints.map(\.y).max() ?? 0))%")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                            Text("Höchste Energie")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack(spacing: 4) {
                            Text("\(Int(energyGraphPoints.map(\.y).min() ?? 0))%")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.red)
                            Text("Niedrigste Energie")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack(spacing: 4) {
                            Text("\(Int(energyGraphPoints.map(\.y).reduce(0, +) / Double(energyGraphPoints.count)))%")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.blue)
                            Text("Durchschnitt")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            } else {
                Text("Keine Energiedaten aufgezeichnet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - Refreshment Summary Card
    private var refreshmentSummaryCard: some View {
        VStack(spacing: 16) {
            // Card header
            HStack {
                Image(systemName: "bed.double.fill")
                    .font(.title2)
                    .foregroundColor(.purple)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Morgendliche Erholung & Aufwachen")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Schritt 1")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            // Refreshment level
            VStack(spacing: 12) {
                HStack {
                    Text("Erholungsgrad")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Spacer()
                    Text("\(Int(refreshmentLevel))/10")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.purple)
                }
                
                // Visual progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 8)
                            .cornerRadius(4)
                        
                        Rectangle()
                            .fill(Color.purple)
                            .frame(width: geometry.size.width * (refreshmentLevel / 10), height: 8)
                            .cornerRadius(4)
                    }
                }
                .frame(height: 8)
                
                // Wake-up time
                HStack(spacing: 20) {
                    VStack(spacing: 4) {
                        Text("\(wakeUpHour):00")
                            .font(.title)
                        Text("Aufwachzeit")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - Fatigue Summary Card
    private var fatigueSummaryCard: some View {
        VStack(spacing: 16) {
            // Card header
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title2)
                    .foregroundColor(hasExcessiveFatigue == true ? .red : .green)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Übermäßige Crash-Bewertung")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Schritt 3")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            // Fatigue response
            HStack {
                Text("Übermäßige Crash-Erfahrung:")
                    .font(.subheadline)
                Spacer()
                Text(hasExcessiveFatigue == true ? "Ja" : "Nein")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(hasExcessiveFatigue == true ? .red : .green)
            }
            .padding(16)
            .background(hasExcessiveFatigue == true ? Color.red.opacity(0.1) : Color.green.opacity(0.1))
            .cornerRadius(12)
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - Crash Time Summary Card
    private var crashTimeSummaryCard: some View {
        VStack(spacing: 16) {
            // Card header
            HStack {
                Image(systemName: "clock.fill")
                    .font(.title2)
                    .foregroundColor(.orange)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Crash-Details")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Schritt 4")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                // Crash time
                if !crashTimeOfDay.isEmpty {
                    HStack {
                        Text("Crash aufgetreten:")
                            .font(.subheadline)
                        Spacer()
                        Text(crashTimeOfDay)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.orange)
                    }
                }
                
                // Selected symptoms
                if !selectedSymptoms.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Erlebte Symptome:")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 8) {
                            ForEach(Array(selectedSymptoms), id: \.self) { symptom in
                                Text(symptom)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.orange.opacity(0.2))
                                    .cornerRadius(6)
                            }
                        }
                    }
                }
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - Symptom Checklist Summary Card
    private var symptomChecklistSummaryCard: some View {
        VStack(spacing: 16) {
            // Card header
            HStack {
                Image(systemName: "list.bullet.clipboard")
                    .font(.title2)
                    .foregroundColor(.red)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Symptom-Checkliste")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Schritt 4")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            if !selectedSymptoms.isEmpty {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 8) {
                    ForEach(Array(selectedSymptoms), id: \.self) { symptom in
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(.red)
                            Text(symptom)
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(6)
                    }
                }
            } else {
                Text("Keine Symptome ausgewählt")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - Other Symptoms Summary Card
    private var otherSymptomsSummaryCard: some View {
        VStack(spacing: 16) {
            // Card header
            HStack {
                Image(systemName: "text.bubble")
                    .font(.title2)
                    .foregroundColor(.purple)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Zusätzliche Symptome")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Schritt 5")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            Text(otherSymptomsDescription)
                .font(.subheadline)
                .padding(12)
                .background(Color(.systemGray6))
                .cornerRadius(8)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - Additional Health Summary Card
    private var additionalHealthSummaryCard: some View {
        VStack(spacing: 16) {
            // Card header
            HStack {
                Image(systemName: "heart.text.square")
                    .font(.title2)
                    .foregroundColor(.green)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Crash Informationen")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Schritt 5")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            VStack(spacing: 12) {
                // Crash duration
                if !crashDuration.isEmpty {
                    HStack {
                        Text("Crash-Dauer:")
                            .font(.subheadline)
                        Spacer()
                        Text(crashDuration)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.green)
                    }
                    
                    if crashDurationNumber > 1 && crashDuration != "Keine dieser Antworten" && crashDuration != "Ich bin aktuell noch in einem Crash" {
                        HStack {
                            Text("Dauer-Anzahl:")
                                .font(.subheadline)
                            Spacer()
                            Text("\(Int(crashDurationNumber))")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.green)
                        }
                    }
                }
                
                // Crash trigger
                if !crashTrigger.isEmpty {
                    HStack {
                        Text("Crash-Auslöser:")
                            .font(.subheadline)
                        Spacer()
                    }
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 8) {
                        ForEach(Array(crashTrigger), id: \.self) { trigger in
                            Text(trigger)
                                .font(.caption)
                                .padding(8)
                                .background(Color.green.opacity(0.1))
                                .cornerRadius(6)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    
                    // Show sub-triggers if any are selected
                    if !selectedSubTriggers.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Spezifische Beispiele:")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 6) {
                                ForEach(Array(selectedSubTriggers), id: \.self) { subTrigger in
                                    Text(subTrigger)
                                        .font(.caption2)
                                        .padding(6)
                                        .background(Color.green.opacity(0.05))
                                        .cornerRadius(4)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                        }
                    }
                }
                
                // Trigger description
                if !crashTriggerDescription.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Detaillierte Beschreibung:")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text(crashTriggerDescription)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .italic()
                    }
                }
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - All Responses Summary Card
    private var allResponsesSummaryCard: some View {
        VStack(spacing: 16) {
            // Card header
            HStack {
                Image(systemName: "doc.text.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
            
                VStack(alignment: .leading, spacing: 2) {
                    Text("Alle Antworten im Detail")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("Vollständige Übersicht")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            
                Spacer()
            }
        
            VStack(spacing: 16) {
                // Step 1 Details
                VStack(alignment: .leading, spacing: 8) {
                    Text("Schritt 1: Morgendliche Erholung")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.purple)
                
                    VStack(alignment: .leading, spacing: 4) {
                        Text("• Erholungsgrad: \(Int(refreshmentLevel))/10")
                            .font(.caption)
                        Text("• Aufwachzeit: \(wakeUpHour):00")
                            .font(.caption)
                        Text("• Schlafqualität: \(Int(sleepQualitySlider))/10")
                            .font(.caption)
                    }
                    .padding(.leading, 8)
                }
                .padding(12)
                .background(Color.purple.opacity(0.05))
                .cornerRadius(8)
            
                // Step 2 Details
                VStack(alignment: .leading, spacing: 8) {
                    Text("Schritt 2: Energieverlauf")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                
                    VStack(alignment: .leading, spacing: 4) {
                        if !energyGraphPoints.isEmpty {
                            Text("• Energiepunkte aufgezeichnet: \(energyGraphPoints.count)")
                                .font(.caption)
                            Text("• Höchste Energie: \(Int(energyGraphPoints.map(\.y).max() ?? 0))%")
                                .font(.caption)
                            Text("• Niedrigste Energie: \(Int(energyGraphPoints.map(\.y).min() ?? 0))%")
                                .font(.caption)
                            Text("• Durchschnittliche Energie: \(Int(energyGraphPoints.map(\.y).reduce(0, +) / Double(energyGraphPoints.count)))%")
                                .font(.caption)
                        } else {
                            Text("• Keine Energiedaten aufgezeichnet")
                                .font(.caption)
                        }
                    }
                    .padding(.leading, 8)
                }
                .padding(12)
                .background(Color.blue.opacity(0.05))
                .cornerRadius(8)
            
                // Step 3 Details
                VStack(alignment: .leading, spacing: 8) {
                    Text("Schritt 3: Crash-Bewertung")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(hasExcessiveFatigue == true ? .red : .green)
                
                    VStack(alignment: .leading, spacing: 4) {
                        Text("• Übermäßige Erschöpfung erlebt: \(hasExcessiveFatigue == true ? "Ja" : "Nein")")
                            .font(.caption)
                    }
                    .padding(.leading, 8)
                }
                .padding(12)
                .background((hasExcessiveFatigue == true ? Color.red : Color.green).opacity(0.05))
                .cornerRadius(8)
            
                // Step 4 Details (Conditional)
                if hasExcessiveFatigue == true {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Schritt 4: Crash-Details")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.orange)
                    
                        VStack(alignment: .leading, spacing: 4) {
                            if !crashTimeOfDay.isEmpty {
                                Text("• Crash-Zeitpunkt: \(crashTimeOfDay)")
                                    .font(.caption)
                            } else {
                                Text("• Crash-Zeit: \(crashTimeDate, formatter: twentyFourHourFormatter)")
                                    .font(.caption)
                            }
                        
                            if !selectedSymptoms.isEmpty {
                                Text("• Symptome (\(selectedSymptoms.count)):")
                                    .font(.caption)
                                ForEach(Array(selectedSymptoms).sorted(), id: \.self) { symptom in
                                    Text("  - \(symptom)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            } else {
                                Text("• Keine Symptome ausgewählt")
                                    .font(.caption)
                            }
                        }
                        .padding(.leading, 8)
                    }
                    .padding(12)
                    .background(Color.orange.opacity(0.05))
                    .cornerRadius(8)
                } else if hasExcessiveFatigue == false {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Schritt 4: Symptom-Checkliste")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.red)
                    
                        VStack(alignment: .leading, spacing: 4) {
                            if !selectedSymptoms.isEmpty {
                                Text("• Ausgewählte Symptome (\(selectedSymptoms.count)):")
                                    .font(.caption)
                                ForEach(Array(selectedSymptoms).sorted(), id: \.self) { symptom in
                                    Text("  - \(symptom)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            } else {
                                Text("• Keine Symptome ausgewählt")
                                    .font(.caption)
                            }
                        }
                        .padding(.leading, 8)
                    }
                    .padding(12)
                    .background(Color.red.opacity(0.05))
                    .cornerRadius(8)
                }
            
                // Step 5 Details (Conditional)
                if hasExcessiveFatigue == true {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Schritt 5: Crash-Informationen")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.green)
                    
                        VStack(alignment: .leading, spacing: 4) {
                            if !crashDuration.isEmpty {
                                Text("• Crash-Dauer: \(crashDuration)")
                                    .font(.caption)
                            
                                if crashDurationNumber > 1 && crashDuration != "Keine dieser Antworten" && crashDuration != "Ich bin aktuell noch in einem Crash" {
                                    Text("• Anzahl: \(Int(crashDurationNumber))")
                                        .font(.caption)
                                }
                            }
                        
                            if !crashTrigger.isEmpty {
                                Text("• Crash-Auslöser:")
                                    .font(.subheadline)
                                Spacer()
                                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 8) {
                                    ForEach(Array(crashTrigger), id: \.self) { trigger in
                                        Text(trigger)
                                            .font(.caption)
                                            .padding(8)
                                            .background(Color.green.opacity(0.1))
                                            .cornerRadius(6)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                }
                            }
                        
                            if !selectedSubTriggers.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Spezifische Beispiele:")
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.secondary)
                                    
                                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 6) {
                                        ForEach(Array(selectedSubTriggers), id: \.self) { subTrigger in
                                            Text(subTrigger)
                                                .font(.caption2)
                                                .padding(6)
                                                .background(Color.green.opacity(0.05))
                                                .cornerRadius(4)
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(12)
                    .background(Color.green.opacity(0.05))
                    .cornerRadius(8)
                } else if hasExcessiveFatigue == false && !otherSymptomsDescription.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Schritt 5: Zusätzliche Symptome")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.purple)
                    
                        VStack(alignment: .leading, spacing: 4) {
                            Text("• Beschreibung:")
                                .font(.caption)
                            Text("\"\(otherSymptomsDescription)\"")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .italic()
                        }
                        .padding(.leading, 8)
                    }
                    .padding(12)
                    .background(Color.purple.opacity(0.05))
                    .cornerRadius(8)
                }
            
                // Submission Details
                VStack(alignment: .leading, spacing: 8) {
                    Text("Übermittlungsdetails")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.gray)
                
                    VStack(alignment: .leading, spacing: 4) {
                        Text("• Abgeschlossen am: \(Date(), formatter: fullDateFormatter)")
                            .font(.caption)
                        Text("• Benutzer-ID: \(UserIDManager.shared.getCurrentUserId().prefix(8))...")
                            .font(.caption)
                        Text("• Fragebogen-Version: 6.0")
                            .font(.caption)
                    }
                    .padding(.leading, 8)
                }
                .padding(12)
                .background(Color.gray.opacity(0.05))
                .cornerRadius(8)
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    // MARK: - External Questionnaire Section
    private var externalQuestionnaireSection: some View {
        EmptyView()
    }

    // MARK: - Questionnaire Navigation Buttons
    private var questionnaireNavigationButtons: some View {
        VStack {
            Spacer()
            
            HStack(spacing: 16) {
                if currentQuestionnaireStep > 1 {
                    Button("Vorherige") {
                        currentQuestionnaireStep -= 1
                    }
                    .buttonStyle(.bordered)
                    .tint(.gray)
                }
                
                Spacer()
                
                Button(currentQuestionnaireStep < totalSteps ? "Nächste" : "Complete") {
                    if currentQuestionnaireStep < totalSteps {
                        currentQuestionnaireStep += 1
                    } else {
                        Task {
                            await completeQuestionnaire()
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(!canProceedToNext || isSubmitting)
                .opacity((canProceedToNext && !isSubmitting) ? 1.0 : 0.6)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 34)
            .background(
                Color(.systemBackground)
                    .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
            )
        }
    }

    // MARK: - Computed Properties for Summary
    private var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }

    private var sleepQualityIcon: String {
        switch sleepQuality {
        case "Good":
            return "moon.stars.fill"
        case "Fair":
            return "moon.fill"
        case "Poor":
            return "moon"
        default:
            return "moon.fill"
        }
    }

    private var sleepQualityColor: Color {
        switch sleepQuality {
        case "Good":
            return .green
        case "Fair":
            return .orange
        case "Poor":
            return .red
        default:
            return .gray
        }
    }

    private var timeOnlyFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }
    
    // MARK: - Computed Properties
    private var timeSlots: [String] {
        return ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM", "10:00 PM"]
    }

    private var crashTimeOptions: [String] {
        return [
            "Morning (06:00 - 09:59)",
            "Late Morning (10:00 - 11:59)",
            "Midday (12:00 - 13:59)",
            "Afternoon (14:00 - 16:59)",
            "Evening (17:00 - 20:59)",
            "At night (21:00 - 05:59)"
        ]
    }

    private var crashDurationOptions: [String] {
        return [
            "Minuten",
            "Stunden",
            "Tage",
            "Wochen",
            "Monate",
            "Ich bin aktuell noch in einem Crash",
            "Keine dieser Antworten"
        ]
    }

    private var symptomOptions: [String] {
        return [
            "Allgemeine Schmerzen",
            "Muskelschmerzen",
            "Gelenkschmerzen",
            "Erschöpfung",
            "Konzentrationsprobleme",
            "Brainfog",
            "Kopfschmerzen",
            "Übelkeit",
            "Schwindel",
            "Herzrasen",
            "Grippeartige Symptome",
            "Geschwollene Lymphknoten",
            "Empfindlichkeit gegenüber Licht, Geräuschen oder Gerüchen",
            "Schlafstörungen",
            "Nervenkribbeln"
        ]
    }

    private var crashDurationNumberQuestionText: String {
        switch crashDuration {
        case "Minuten":
            return "Wie viele Minuten dauerte der Crash?"
        case "Stunden":
            return "Wie viele Stunden dauerte der Crash?"
        case "Tage":
            return "Wie viele Tage dauerte der Crash?"
        case "Wochen":
            return "Wie viele Wochen dauerte der Crash?"
        case "Monate":
            return "Wie viele Monate dauerte der Crash?"
        default:
            return "Wie lange dauerte der Crash?"
        }
    }

    private var crashDurationMaxValue: Double {
        switch crashDuration {
        case "Minuten":
            return 60
        case "Stunden":
            return 24
        case "Tage":
            return 30
        case "Wochen":
            return 12
        case "Monate":
            return 12
        default:
            return 10
        }
    }

    private var totalSteps: Int {
        if hasExcessiveFatigue == true {
            return 6  // Changed from 5 to 6
        } else if hasExcessiveFatigue == false {
            return 5
        } else {
            return 6
        }
    }

    private var canProceedToNext: Bool {
        switch currentQuestionnaireStep {
        case 1:
            return true
        case 2:
            return !energyGraphPoints.isEmpty
        case 3:
            return hasExcessiveFatigue != nil
        case 4:
            if hasExcessiveFatigue == true {
                return !crashTimeOfDay.isEmpty || crashTimeDate != Date()
            } else if hasExcessiveFatigue == false {
                return true
            } else {
                return false
            }
        case 5:
            return hasExcessiveFatigue == true ? !selectedSymptoms.isEmpty : true
        case 6:
            if hasExcessiveFatigue == true {
                return isFormValid && !isSubmitting
            }
            return !isSubmitting
        default:
            return false
        }
    }

    private var isFormValid: Bool {
        if hasExcessiveFatigue == true {
            return !crashDuration.isEmpty
        }
        return true
    }
    
    private var timeLabels: [String] {
        return [
            "8:00", "8:30", "9:00", "9:30", "10:00", "10:30",
            "11:00", "11:30", "12:00", "12:30", "1:00", "1:30",
            "2:00", "2:30", "3:00", "3:30", "4:00", "4:30",
            "5:00", "5:30", "6:00", "6:30", "7:00", "7:30",
            "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"
        ]
    }

    private var feelingOptions: [Feeling] {
        return [
            Feeling(emoji: "😀", label: "Happy"),
            Feeling(emoji: "👌", label: "OK"),
            Feeling(emoji: "😔", label: "Sad"),
            Feeling(emoji: "😡", label: "Angry"),
            Feeling(emoji: "😨", label: "Anxious"),
            Feeling(emoji: "😌", label: "Calm"),
            Feeling(emoji: "⚡", label: "Energetic")
        ]
    }
    
    // MARK: - Motivational Text Array
    private var motivationalTexts: [String] {
        return [
            "Geschafft! Vielen Dank für das Ausfüllen der Fragen.",
            "Vielen Dank – Ihre Antworten helfen uns sehr weiter!",
            "Super, Sie sind durch! Vielen Dank für Ihre Zeit.",
            "Vielen lieben Dank fürs Mitmachen!",
            "Das war's – wir wissen Ihre Teilnahme sehr zu schätzen.",
            "Danke, dass Sie sich die Zeit genommen haben!",
            "Tausend Dank – Sie haben einen wichtigen Beitrag geleistet!"
        ]
    }
    
    // MARK: - Helper Methods
    private func toggleBodyArea(_ area: String) {
        if selectedBodyAreas.contains(area) {
            selectedBodyAreas.remove(area)
        } else {
            selectedBodyAreas.insert(area)
        }
    }

    private func toggleSymptom(_ symptom: String) {
        if selectedSymptoms.contains(symptom) {
            selectedSymptoms.remove(symptom)
        } else {
            selectedSymptoms.insert(symptom)
        }
    }

    // MARK: - Random Motivational Text Function
    private func getRandomMotivationalText() -> String {
        let calendar = Calendar.current
        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: Date()) ?? 1
        let index = (dayOfYear - 1) % motivationalTexts.count
        return motivationalTexts[index]
    }

    private func completeQuestionnaire() async {
        guard !isSubmitting else {
            print("⚠️ Already submitting, ignoring duplicate request")
            return
        }
        
        await MainActor.run {
            isSubmitting = true
            submitError = nil
        }
        
        do {
            let currentUserId = UserIDManager.shared.getCurrentUserId()
            
            guard !currentUserId.isEmpty else {
                throw NSError(domain: "ValidationError", code: 0, userInfo: [NSLocalizedDescriptionKey: "User ID is missing"])
            }

            guard !energyLevelsAtTimes.isEmpty || !energyGraphPoints.isEmpty else {
                throw NSError(domain: "ValidationError", code: 0, userInfo: [NSLocalizedDescriptionKey: "No energy data provided"])
            }

            if hasExcessiveFatigue == true {
                guard !crashDuration.isEmpty else {
                    throw NSError(domain: "ValidationError", code: 0, userInfo: [NSLocalizedDescriptionKey: "Crash duration must be specified"])
                }
            }
            
            let questionnaireData: [String: Any] = [
                "timestamp": ISO8601DateFormatter().string(from: Date()),
                "userId": currentUserId,
                "dataType": "completeQuestionnaire",
                
                "energyLevelsAtTimes": energyLevelsAtTimes.isEmpty ? [:] : energyLevelsAtTimes,
                "energyGraphPoints": energyGraphPoints.map { point in
                    [
                        "timeInterval": Double(point.x),
                        "energyLevel": Double(point.y),
                        "timestamp": formatTimeInterval(point.x)
                    ]
                },
                
                "refreshmentLevel": refreshmentLevel,
                "hasExcessiveFatigue": hasExcessiveFatigue ?? false,
                "crashTimeOfDay": crashTimeOfDay.isEmpty ? "Not specified" : crashTimeOfDay,
                "selectedBodyAreas": Array(selectedBodyAreas),
                "selectedSymptoms": Array(selectedSymptoms),
                "otherSymptomsDescription": otherSymptomsDescription.isEmpty ? "None" : otherSymptomsDescription,
                
                "crashDuration": crashDuration.isEmpty ? "Not specified" : crashDuration,
                "crashDurationNumber": crashDurationNumber,
                "crashTrigger": Array(crashTrigger),
                "crashSubTriggers": Array(selectedSubTriggers),
                "crashTriggerDescription": crashTriggerDescription.isEmpty ? "None" : crashTriggerDescription,
                "fatigueDate": ISO8601DateFormatter().string(from: fatigueDate),
                "fatigueDescription": fatigueDescription.isEmpty ? "None" : fatigueDescription,
                
                "sleepQuality": sleepQuality,
                "sleepDuration": sleepDuration,
                "sleepStages": sleepStages,
                "sleepAssessment": sleepAssessment.isEmpty ? "No assessment" : sleepAssessment,
                "healthKitAuthorized": healthKitAuthorized,
                
                "completionStatus": "completed",
                "questionnaireVersion": "6.0",
                "wakeUpHour": wakeUpHour
            ]
            
            print("📝 Attempting to save questionnaire data for user: \(currentUserId)")
            print("📊 Energy levels count: \(energyLevelsAtTimes.count)")
            print("📈 Graph points count: \(energyGraphPoints.count)")
            
            try await DatabaseManager.shared.saveQuestionnaireData(userId: currentUserId, questionnaireData: questionnaireData)
            
            await MainActor.run {
                isSubmitting = false
                questionnaireCompleted = true
                questionnaireManager.markQuestionnaireSubmitted()
                showingSubmitSuccess = true
                print("✅ Questionnaire submitted successfully")
            }
            
        } catch {
            print("❌ Error saving questionnaire: \(error)")
            print("📊 Full error details: \(error.localizedDescription)")
            
            print("🔍 Questionnaire data being sent:")
            print("   - User ID: \(UserIDManager.shared.getCurrentUserId())")
            print("   - Energy levels: \(energyLevelsAtTimes)")
            print("   - Graph points: \(energyGraphPoints.count)")
            print("   - Crash duration: \(crashDuration)")
            print("   - Sleep quality: \(sleepQuality)")
            
            await MainActor.run {
                isSubmitting = false
                submitError = "Failed to save questionnaire: \(error.localizedDescription)"
                showingSubmitError = true
            }
        }
    }

    private func retakeQuestionnaire() {
        showingWelcome = true
        currentQuestionnaireStep = 0
        questionnaireCompleted = false
        energyLevelsAtTimes.removeAll()
        energyGraphPoints.removeAll()
        
        refreshmentLevel = 1.0
        hasExcessiveFatigue = nil
        crashTimeOfDay = ""
        selectedBodyAreas.removeAll()
        selectedSymptoms.removeAll()
        otherSymptomsDescription = ""
        
        crashDuration = ""
        crashDurationNumber = 1.0
        crashTrigger.removeAll()
        selectedSubTriggers.removeAll()
        crashTriggerDescription = ""
        fatigueDescription = ""
        
        sleepQuality = "Fair"
        wakeUpTime = Date()
    }
    
    // MARK: - Functions
    
    private func handleChartTap(at location: CGPoint) {
        let chartWidth: CGFloat = UIScreen.main.bounds.width - 64
        let timeRatio = location.x / chartWidth
        selectedTimePoint = max(0, min(23, timeRatio * 24))
        showingEnergyPopover = true
    }
    
    private func addEnergyReading() {
        let hour = Int(selectedTimePoint)
        let newDataPoint = EnergyDataPoint(
            timestamp: Date(),
            hour: hour,
            energyLevel: selectedEnergyLevel
        )
        
        energyDataPoints.removeAll { $0.hour == hour }
        energyDataPoints.append(newDataPoint)
        energyDataPoints.sort { $0.hour < $1.hour }
        
        saveEnergyData()
    }
    
    private func submitEnergyReading() {
        guard apiChecker.canReachAPI else {
            showingAPIAlert = true
            return
        }
        
        isSubmittingEnergy = true
        
        Task {
            do {
                let currentUserId = UserIDManager.shared.getCurrentUserId()
                let energyData: [String: Any] = [
                    "timestamp": ISO8601DateFormatter().string(from: Date()),
                    "userId": currentUserId,
                    "dataType": "energyReading",
                    "energyDataPoints": energyDataPoints.map { point in
                        [
                            "timestamp": ISO8601DateFormatter().string(from: point.timestamp),
                            "hour": point.hour,
                            "energyLevel": point.energyLevel
                        ]
                    }
                ]
                
                try await DatabaseManager.shared.saveQuestionnaireData(userId: currentUserId, questionnaireData: energyData)
                
                await MainActor.run {
                    isSubmittingEnergy = false
                }
            } catch {
                await MainActor.run {
                    isSubmittingEnergy = false
                }
            }
        }
    }
    
    private func checkQuestionnaireStatus() {
        questionnaireManager.checkSubmissionStatus()
        let hasSubmittedToday = questionnaireManager.hasSubmittedToday
        
        if hasSubmittedToday {
            questionnaireCompleted = true
            showingWelcome = false
            currentQuestionnaireStep = 0
        } else {
            questionnaireCompleted = false
            showingWelcome = true
            currentQuestionnaireStep = 0
        }
    }
    
    private func loadEnergyData() {
        if let savedData = UserDefaults.standard.data(forKey: "todaysEnergyData"),
           let decodedData = try? JSONDecoder().decode([EnergyDataPoint].self, from: savedData) {
            energyDataPoints = decodedData.filter { Calendar.current.isDateInToday($0.timestamp) }
        }
    }
    
    private func saveEnergyData() {
        if let encoded = try? JSONEncoder().encode(energyDataPoints) {
            UserDefaults.standard.set(encoded, forKey: "todaysEnergyData")
        }
        
        NotificationCenter.default.post(name: Notification.Name("EnergyDataChanged"), object: nil)
    }
    
    // MARK: - HealthKit Functions
    
    private func checkHealthKitAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        
        let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        let status = healthStore.authorizationStatus(for: sleepType)
        
        healthKitAuthorized = (status == .sharingAuthorized)
        
        if healthKitAuthorized {
            fetchSleepData()
        }
    }
    
    private func requestHealthKitAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            showingHealthKitAlert = true
            return
        }
        
        let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        let typesToRead: Set<HKObjectType> = [sleepType]
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                if success {
                    self.healthKitAuthorized = true
                    self.fetchSleepData()
                } else {
                    self.showingHealthKitAlert = true
                }
            }
        }
    }
    
    private func fetchSleepData() {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return }
        
        let calendar = Calendar.current
        let now = Date()
        let startOfToday = calendar.startOfDay(for: now)
        let startOfYesterday = calendar.date(byAdding: .day, value: -1, to: startOfToday)!
        
        let predicate = HKQuery.predicateForSamples(withStart: startOfYesterday, end: startOfToday, options: .strictStartDate)
        
        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            guard let samples = samples as? [HKCategorySample], error == nil else { return }
            
            var totalSleepDuration: TimeInterval = 0
            var stages: [String: TimeInterval] = [:]
            
            for sample in samples {
                let duration = sample.endDate.timeIntervalSince(sample.startDate)
                
                switch sample.value {
                case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue:
                    totalSleepDuration += duration
                    stages["Light"] = (stages["Light"] ?? 0) + duration
                case HKCategoryValueSleepAnalysis.asleepCore.rawValue:
                    totalSleepDuration += duration
                    stages["Core"] = (stages["Core"] ?? 0) + duration
                case HKCategoryValueSleepAnalysis.asleepDeep.rawValue:
                    totalSleepDuration += duration
                    stages["Deep"] = (stages["Deep"] ?? 0) + duration
                case HKCategoryValueSleepAnalysis.asleepREM.rawValue:
                    totalSleepDuration += duration
                    stages["REM"] = (stages["REM"] ?? 0) + duration
                default:
                    break
                }
            }
            
            DispatchQueue.main.async {
                self.sleepDuration = totalSleepDuration / 3600
                self.sleepStages = stages.mapValues { $0 / 3600 }
                self.generateSleepAssessment()
            }
        }
        
        healthStore.execute(query)
    }
    
    private func generateSleepAssessment() {
        if sleepQualitySlider < 4 {
            sleepAssessment = "Your sleep was insufficient; consider resting more."
        } else if sleepQualitySlider >= 7 {
            sleepAssessment = "Great sleep; you should feel refreshed today."
        } else {
            sleepAssessment = "Your sleep was fair; monitor how you feel today."
        }
    }
    
    private func formatTimeInterval(_ interval: Double) -> String {
        let baseHour = 8
        let totalMinutes = Int(interval * 30)
        let hours = (baseHour + totalMinutes / 60) % 24
        let minutes = totalMinutes % 60
        
        let period = hours < 12 ? "AM" : "PM"
        let displayHour = hours == 0 ? 12 : (hours > 12 ? hours - 12 : hours)
        
        return String(format: "%d:%02d %@", displayHour, minutes, period)
    }
    
    private func convertToCanvasPoint(_ point: CGPoint, canvasSize: CGSize) -> CGPoint {
        let x = (point.x / 24) * canvasSize.width
        let y = ((5 - point.y) / 7) * canvasSize.height
        
        return CGPoint(x: x, y: y)
    }

    private func toggleCrashTrigger(_ trigger: String) {
        if crashTrigger.contains(trigger) {
            crashTrigger.remove(trigger)
        } else {
            crashTrigger.insert(trigger)
        }
    }
    
    private func submitQuestionnaire() {
        guard apiChecker.canReachAPI else {
            showingAPIAlert = true
            return
        }
        
        isSubmitting = true
        submitError = nil
        
        Task {
            do {
                let currentUserId = UserIDManager.shared.getCurrentUserId()
                
                let questionnaireData: [String: Any] = [
                    "timestamp": ISO8601DateFormatter().string(from: Date()),
                    "userId": currentUserId,
                    "dataType": "dailyQuestionnaire",
                    
                    "crashDuration": crashDuration,
                    "crashDurationNumber": crashDurationNumber,
                    "crashTrigger": Array(crashTrigger),
                    "crashTriggerDescription": crashTriggerDescription,
                    "fatigueDate": fatigueDate,
                    "fatigueDescription": fatigueDescription,
                    
                    "sleepQuality": sleepQuality,
                    "sleepDuration": sleepDuration,
                    "sleepStages": sleepStages,
                    "sleepAssessment": sleepAssessment,
                    "healthKitAuthorized": healthKitAuthorized,
                    
                    "completionStatus": "completed",
                    "questionnaireVersion": "6.0",
                    "wakeUpHour": wakeUpHour
                ]
                
                try await DatabaseManager.shared.saveQuestionnaireData(userId: currentUserId, questionnaireData: questionnaireData)
                
                questionnaireManager.markQuestionnaireSubmitted()
                
                await MainActor.run {
                    isSubmitting = false
                    questionnaireSubmitted = true
                    showingSubmitSuccess = true
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    submitError = "Submission failed: \(error.localizedDescription)"
                }
            }
        }
    }
}

// MARK: - EnergyDataPoint Model
struct EnergyDataPoint: Codable, Identifiable {
    let id = UUID()
    let timestamp: Date
    let hour: Int
    let energyLevel: Int
}

struct UserLogView_Previews: PreviewProvider {
    static var previews: some View {
        UserLogView()
    }
}

// MARK: - Feeling Model
struct Feeling: Identifiable {
    let id = UUID()
    let emoji: String
    let label: String
}

// MARK: - Body Area Models
struct BodyArea {
    let name: String
    let shape: BodyAreaShape
}

enum BodyAreaShape {
    case circle(center: CGPoint, radius: Double)
    case rectangle(topLeft: CGPoint, size: CGSize)
    case polygon(points: [CGPoint])
}

// MARK: - Helper function to get current day in German
private func getCurrentDayInGerman() -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "de_DE")
    formatter.dateFormat = "EEEE"
    return formatter.string(from: Date())
}

private var dateOnlyFormatter: DateFormatter {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .none
    return formatter
}

private var fullDateFormatter: DateFormatter {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    return formatter
}
