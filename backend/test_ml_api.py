import urllib.request
import json

def test():
    # 1. Test /model/metrics
    res = urllib.request.urlopen('http://127.0.0.1:8000/model/metrics')
    metrics = json.loads(res.read().decode())
    print("=== /model/metrics ===")
    print("Model:", metrics['model_type'])
    print("Accuracy:", metrics['accuracy'])
    print("Precision:", metrics['precision'])
    print("Recall:", metrics['recall'])
    print("F1-Score:", metrics['f1_score'])
    print("Confusion Matrix:", metrics['confusion_matrix'])
    print("Unsupervised Model:", metrics['unsupervised_model'])

    # 2. Test /model/predictions
    res2 = urllib.request.urlopen('http://127.0.0.1:8000/model/predictions?limit=5')
    preds = json.loads(res2.read().decode())
    print("\n=== /model/predictions (Top 5) ===")
    print("Formula:", preds['formula'])
    for p in preds['predictions']:
        print(f"Project: {p['project_id']} | Old Score: {p['old_risk_score']} | ML Prob: {p['ml_probability']} | Pred: {p['predicted_label']} | Final Score: {p['final_score']}")

    # 3. Test project detail
    res3 = urllib.request.urlopen('http://127.0.0.1:8000/api/projects/MPLAD-2026-1001')
    detail = json.loads(res3.read().decode())
    print("\n=== /api/projects/MPLAD-2026-1001 ===")
    print("Title:", detail['title'])
    print("ML Probability:", detail.get('ml_probability'))
    print("Predicted Label:", detail.get('predicted_label'))
    print("Final Combined Score:", detail.get('final_score'))

if __name__ == '__main__':
    test()
