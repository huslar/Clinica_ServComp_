using DPFP;
using DPFP.Capture;
using DPFP.Processing;
using System.Drawing;
using System.Drawing.Imaging;
using System.Windows.Forms;

const string corsPolicy = "LocalClinicalApp";

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:52181");
builder.Services.AddCors(options => options.AddPolicy(corsPolicy, policy => policy
    .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()));
builder.Services.AddSingleton<FingerprintReader>();

var app = builder.Build();
app.UseCors(corsPolicy);
app.MapGet("/health", (FingerprintReader reader) =>
{
    var status = reader.GetStatus();
    return status.Connected
        ? Results.Ok(status)
        : Results.Json(status, statusCode: StatusCodes.Status503ServiceUnavailable);
});
app.MapGet("/capture/status", (FingerprintReader reader) => Results.Ok(reader.GetCaptureStatus()));
app.MapPost("/capture", async (CaptureRequest request, FingerprintReader reader, CancellationToken cancellationToken) =>
{
    if (request.Samples is < 1 or > 8) return Results.BadRequest(new { message = "La cantidad de muestras no es valida" });
    if (request.Format is not null && request.Format != "DPFP_PROPRIETARY") return Results.BadRequest(new { message = "El formato solicitado no es compatible con el lector" });
    try
    {
        return Results.Ok(await reader.CaptureAsync(cancellationToken));
    }
    catch (InvalidOperationException error)
    {
        return Results.Json(new { message = error.Message }, statusCode: StatusCodes.Status409Conflict);
    }
    catch (TimeoutException error)
    {
        return Results.Json(new { message = error.Message }, statusCode: StatusCodes.Status408RequestTimeout);
    }
});
app.MapPost("/match", (MatchRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.FeatureSet) || request.Candidates is null || request.Candidates.Count > 1000)
    {
        return Results.BadRequest(new { message = "Los datos de cotejo no son validos" });
    }
    try
    {
        var features = new FeatureSet();
        features.DeSerialize(Convert.FromBase64String(request.FeatureSet));
        var verification = new DPFP.Verification.Verification();
        foreach (var candidate in request.Candidates)
        {
            var template = new Template();
            template.DeSerialize(Convert.FromBase64String(candidate.Template));
            var result = new DPFP.Verification.Verification.Result();
            verification.Verify(features, template, ref result);
            if (result.Verified) return Results.Ok(new MatchResult(candidate.ProfessionalId, result.FARAchieved));
        }
        return Results.Ok(new MatchResult(null, null));
    }
    catch (FormatException)
    {
        return Results.BadRequest(new { message = "Los datos biometricos de cotejo no son validos" });
    }
});
app.Run();

record CaptureRequest(int Samples = 4, string? Format = "DPFP_PROPRIETARY");
record ReaderStatus(bool Connected, string Device, string? SerialNumber);
record FingerprintCapture(string Template, string VerificationFeatures, string Format, int Quality, string Device);
record CaptureStatus(bool Active, string Message, int SamplesCaptured, int SamplesRequired, string? PreviewImage);
record MatchCandidate(int ProfessionalId, string Template);
record MatchRequest(string FeatureSet, List<MatchCandidate> Candidates);
record MatchResult(int? ProfessionalId, int? FarAchieved);

sealed class FingerprintReader
{
    private readonly SemaphoreSlim captureLock = new(1, 1);
    private readonly object statusLock = new();
    private CaptureStatus captureStatus = new(false, "Presiona Enrolar huella para comenzar", 0, 4, null);

    public ReaderStatus GetStatus()
    {
        var readers = new ReadersCollection();
        readers.Refresh();
        if (readers.Count == 0) return new(false, "U.are.U 4500", null);
        var reader = readers[0];
        return new(true, reader.ProductName, reader.SerialNumber);
    }

    public async Task<FingerprintCapture> CaptureAsync(CancellationToken cancellationToken)
    {
        if (!await captureLock.WaitAsync(0, cancellationToken))
        {
            throw new InvalidOperationException("Ya existe una captura de huella en curso");
        }

        try
        {
            var status = GetStatus();
            if (!status.Connected) throw new InvalidOperationException("No se detecta el lector U.are.U 4500");
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(75));
            using var session = new EnrollmentSession(status.Device, UpdateCaptureStatus);
            try
            {
                return await session.CaptureAsync(timeout.Token);
            }
            catch (Exception error)
            {
                UpdateCaptureStatus(current => current with { Active = false, Message = error.Message });
                throw;
            }
        }
        finally
        {
            captureLock.Release();
            _ = ClearPreviewAfterDelayAsync();
        }
    }

    public CaptureStatus GetCaptureStatus()
    {
        lock (statusLock) return captureStatus;
    }

    private void UpdateCaptureStatus(Func<CaptureStatus, CaptureStatus> update)
    {
        lock (statusLock) captureStatus = update(captureStatus);
    }

    private async Task ClearPreviewAfterDelayAsync()
    {
        await Task.Delay(TimeSpan.FromSeconds(3));
        UpdateCaptureStatus(current => current with { PreviewImage = null });
    }
}

sealed class EnrollmentSession : DPFP.Capture.EventHandler, IDisposable
{
    private readonly string device;
    private readonly Action<Func<CaptureStatus, CaptureStatus>> updateStatus;
    private readonly StaDispatcher dispatcher;
    private DPFP.Capture.Capture? capturer;
    private Enrollment? enroller;
    private byte[]? verificationFeatures;
    private readonly TaskCompletionSource<FingerprintCapture> completion = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private CancellationTokenRegistration cancellationRegistration;

    public EnrollmentSession(string device, Action<Func<CaptureStatus, CaptureStatus>> updateStatus)
    {
        this.device = device;
        this.updateStatus = updateStatus;
        dispatcher = StaDispatcher.Start();
    }

    public async Task<FingerprintCapture> CaptureAsync(CancellationToken cancellationToken)
    {
        cancellationRegistration = cancellationToken.Register(() =>
            completion.TrySetException(new TimeoutException("La captura expiro. Solicita al profesional apoyar el mismo dedo nuevamente")));
        await dispatcher.ExecuteAsync(() =>
        {
            enroller = new Enrollment();
            capturer = new DPFP.Capture.Capture(Priority.Low);
            capturer.EventHandler = this;
            capturer.StartCapture();
        });
        Report(_ => new(true, "Apoya el dedo firmemente sobre el lector", 0, (int)enroller!.FeaturesNeeded, null));
        return await completion.Task;
    }

    public void OnComplete(object capture, string readerSerialNumber, Sample sample)
    {
        try
        {
            var previewImage = ConvertSampleToDataUrl(sample);
            var extractor = new FeatureExtraction();
            var feedback = CaptureFeedback.None;
            var features = new FeatureSet();
            extractor.CreateFeatureSet(sample, DataPurpose.Enrollment, ref feedback, ref features);
            if (feedback != CaptureFeedback.Good)
            {
                Report(current => current with { Message = "La muestra no tiene calidad suficiente. Retira el dedo e intenta nuevamente", PreviewImage = previewImage });
                return;
            }

            enroller!.AddFeatures(features);
            var verificationFeedback = CaptureFeedback.None;
            var verificationSet = new FeatureSet();
            extractor.CreateFeatureSet(sample, DataPurpose.Verification, ref verificationFeedback, ref verificationSet);
            if (verificationFeedback == CaptureFeedback.Good)
            {
                byte[] serializedFeatures = [];
                verificationSet.Serialize(ref serializedFeatures);
                verificationFeatures = serializedFeatures;
            }
            var captured = Math.Max(0, 4 - (int)enroller.FeaturesNeeded);
            Report(current => current with
            {
                Message = enroller.TemplateStatus == Enrollment.Status.Ready
                    ? "Plantilla biometrica completada"
                    : $"Muestra {captured} de 4 aceptada. Retira el dedo y vuelve a apoyarlo",
                SamplesCaptured = captured,
                PreviewImage = previewImage
            });
            if (enroller.TemplateStatus == Enrollment.Status.Failed)
            {
                enroller.Clear();
                completion.TrySetException(new InvalidOperationException("No fue posible construir la plantilla. Limpia el lector e intenta nuevamente"));
                return;
            }
            if (enroller.TemplateStatus != Enrollment.Status.Ready) return;
            if (verificationFeatures is null)
            {
                completion.TrySetException(new InvalidOperationException("No fue posible generar los datos de verificacion. Intenta nuevamente"));
                return;
            }

            byte[] serializedTemplate = [];
            enroller.Template.Serialize(ref serializedTemplate);
            completion.TrySetResult(new FingerprintCapture(
                Convert.ToBase64String(serializedTemplate),
                Convert.ToBase64String(verificationFeatures),
                "DPFP_PROPRIETARY",
                100,
                device));
            Report(current => current with { Active = false, Message = "Plantilla biometrica completada", SamplesCaptured = 4 });
        }
        catch (Exception error)
        {
            completion.TrySetException(new InvalidOperationException($"No fue posible procesar la captura: {error.Message}"));
        }
    }

    public void OnFingerGone(object capture, string readerSerialNumber) =>
        Report(current => current with { Message = current.SamplesCaptured > 0 ? "Vuelve a apoyar el mismo dedo" : "Apoya el dedo firmemente sobre el lector" });
    public void OnFingerTouch(object capture, string readerSerialNumber) =>
        Report(current => current with { Message = "Leyendo huella. Manten el dedo apoyado..." });
    public void OnReaderConnect(object capture, string readerSerialNumber) { }
    public void OnReaderDisconnect(object capture, string readerSerialNumber) =>
        completion.TrySetException(new InvalidOperationException("El lector fue desconectado durante la captura"));
    public void OnSampleQuality(object capture, string readerSerialNumber, CaptureFeedback captureFeedback)
    {
        if (captureFeedback != CaptureFeedback.Good)
        {
            Report(current => current with { Message = "Lectura debil. Ajusta el dedo sobre el centro del lector" });
        }
    }

    private static string ConvertSampleToDataUrl(Sample sample)
    {
        var converter = new SampleConversion();
        Bitmap? bitmap = null;
        converter.ConvertToPicture(sample, ref bitmap);
        if (bitmap is null) return "";
        using (bitmap)
        using (var stream = new MemoryStream())
        {
            bitmap.Save(stream, ImageFormat.Png);
            return $"data:image/png;base64,{Convert.ToBase64String(stream.ToArray())}";
        }
    }

    private void Report(Func<CaptureStatus, CaptureStatus> update)
    {
        updateStatus(update);
    }

    public void Dispose()
    {
        cancellationRegistration.Dispose();
        dispatcher.DisposeCapture(capturer);
    }
}

sealed class StaDispatcher : IDisposable
{
    private readonly Form messageLoop;

    private StaDispatcher(Form messageLoop)
    {
        this.messageLoop = messageLoop;
    }

    public static StaDispatcher Start()
    {
        StaDispatcher? dispatcher = null;
        using var ready = new ManualResetEventSlim();
        var thread = new Thread(() =>
        {
            var form = new Form
            {
                ShowInTaskbar = false,
                FormBorderStyle = FormBorderStyle.None,
                WindowState = FormWindowState.Minimized,
                Opacity = 0
            };
            dispatcher = new StaDispatcher(form);
            form.Shown += (_, _) => ready.Set();
            Application.Run(form);
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.IsBackground = true;
        thread.Start();
        ready.Wait(TimeSpan.FromSeconds(5));
        return dispatcher ?? throw new InvalidOperationException("No fue posible iniciar el contexto de captura");
    }

    public Task ExecuteAsync(Action action)
    {
        var completion = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        messageLoop.BeginInvoke(() =>
        {
            try
            {
                action();
                completion.SetResult();
            }
            catch (Exception error)
            {
                completion.SetException(error);
            }
        });
        return completion.Task;
    }

    public void DisposeCapture(DPFP.Capture.Capture? capturer)
    {
        if (messageLoop.IsDisposed) return;
        messageLoop.BeginInvoke(() =>
        {
            if (capturer is not null)
            {
                try { capturer.StopCapture(); } catch { }
                capturer.EventHandler = null;
                capturer.Dispose();
            }
            messageLoop.Close();
        });
    }

    public void Dispose()
    {
        if (messageLoop.IsDisposed) return;
        messageLoop.BeginInvoke(messageLoop.Close);
    }
}
