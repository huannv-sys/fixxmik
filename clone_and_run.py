#!/usr/bin/env python3
import os
import subprocess
import sys
import json

def execute_command(command, cwd=None):
    """Execute a shell command and return its output"""
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        cwd=cwd
    )
    stdout, stderr = process.communicate()
    return {
        'stdout': stdout.decode('utf-8'),
        'stderr': stderr.decode('utf-8'),
        'returncode': process.returncode
    }

def clone_repository():
    """Clone the fixxmik repository"""
    repo_url = "https://github.com/huannv-sys/fixxmik.git"
    
    # Check if the directory already exists
    if os.path.exists("fixxmik"):
        print("Repository directory already exists. Continuing...")
        # No need to update, just continue
    else:
        print(f"Cloning repository from {repo_url}...")
        result = execute_command(f"git clone {repo_url}")
        
        if result['returncode'] != 0:
            print(f"Error during cloning: {result['stderr']}")
            sys.exit(1)
    
    print("Repository cloned/updated successfully!")
    return os.path.abspath("fixxmik")

def detect_project_type(repo_path):
    """Detect the type of project and how to run it"""
    files = os.listdir(repo_path)
    
    # Check for common configuration files
    has_package_json = "package.json" in files
    has_composer_json = "composer.json" in files
    has_requirements_txt = "requirements.txt" in files
    has_pom_xml = "pom.xml" in files
    has_gradle = "build.gradle" in files or "build.gradle.kts" in files
    has_docker_compose = "docker-compose.yml" in files or "docker-compose.yaml" in files
    has_makefile = "Makefile" in files
    
    # Check for workflow files
    github_workflows_dir = os.path.join(repo_path, ".github", "workflows")
    has_github_workflows = os.path.exists(github_workflows_dir)
    
    workflow_files = []
    if has_github_workflows:
        workflow_files = os.listdir(github_workflows_dir)
    
    return {
        "has_package_json": has_package_json,
        "has_composer_json": has_composer_json,
        "has_requirements_txt": has_requirements_txt,
        "has_pom_xml": has_pom_xml,
        "has_gradle": has_gradle,
        "has_docker_compose": has_docker_compose,
        "has_makefile": has_makefile,
        "has_github_workflows": has_github_workflows,
        "workflow_files": workflow_files,
        "files": files
    }

def parse_github_workflow(workflow_path):
    """Parse a GitHub workflow file to understand how the project is built and run"""
    try:
        with open(workflow_path, 'r') as f:
            content = f.read()
            
        # Simple YAML parsing without depending on a library
        # Look for run: commands
        run_commands = []
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.strip().startswith('run:'):
                # Check if it's a single line command
                command = line.strip()[4:].strip()
                
                # If it's a multiline command
                if not command:
                    j = i + 1
                    multiline_cmd = []
                    while j < len(lines) and (lines[j].startswith(' ') or lines[j].startswith('\t')):
                        multiline_cmd.append(lines[j].strip())
                        j += 1
                    if multiline_cmd:
                        command = "\n".join(multiline_cmd)
                
                if command:
                    run_commands.append(command)
        
        return run_commands
    except Exception as e:
        print(f"Error parsing workflow file: {e}")
        return []

def find_run_steps(repo_path, project_info):
    """Find the steps to run the project based on workflow files or common patterns"""
    run_steps = []
    
    # Check GitHub workflow files
    if project_info["has_github_workflows"] and project_info["workflow_files"]:
        workflow_dir = os.path.join(repo_path, ".github", "workflows")
        
        for workflow_file in project_info["workflow_files"]:
            workflow_path = os.path.join(workflow_dir, workflow_file)
            commands = parse_github_workflow(workflow_path)
            
            for cmd in commands:
                if any(keyword in cmd.lower() for keyword in ["start", "run", "serve", "dev"]):
                    run_steps.append(cmd)
    
    # If no run commands found in workflows, use common patterns
    if not run_steps:
        if project_info["has_package_json"]:
            # Read package.json to find scripts
            package_json_path = os.path.join(repo_path, "package.json")
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                
                scripts = package_data.get("scripts", {})
                for script_name, script_cmd in scripts.items():
                    if script_name in ["start", "dev", "serve"]:
                        run_steps.append(f"npm run {script_name}")
                        break
                else:
                    # If no specific start script found, add a default
                    run_steps.append("npm start")
            except Exception as e:
                print(f"Error reading package.json: {e}")
                run_steps.append("npm start")
        
        elif project_info["has_composer_json"]:
            run_steps.append("php -S 0.0.0.0:5000")
        
        elif project_info["has_requirements_txt"]:
            # Look for app.py, main.py or similar
            python_files = [f for f in project_info["files"] if f.endswith(".py")]
            if "app.py" in python_files:
                run_steps.append("python app.py")
            elif "main.py" in python_files:
                run_steps.append("python main.py")
            elif "manage.py" in python_files:
                run_steps.append("python manage.py runserver 0.0.0.0:5000")
            elif python_files:
                run_steps.append(f"python {python_files[0]}")
        
        elif project_info["has_docker_compose"]:
            run_steps.append("docker-compose up")
        
        elif project_info["has_makefile"]:
            # Check for common Makefile targets
            makefile_path = os.path.join(repo_path, "Makefile")
            try:
                with open(makefile_path, 'r') as f:
                    makefile_content = f.read()
                
                if "run:" in makefile_content:
                    run_steps.append("make run")
                elif "start:" in makefile_content:
                    run_steps.append("make start")
                elif "serve:" in makefile_content:
                    run_steps.append("make serve")
            except Exception:
                run_steps.append("make")
    
    return run_steps

def run_application(repo_path, project_info):
    """Run the application using existing workflow or configuration"""
    run_steps = find_run_steps(repo_path, project_info)
    
    if not run_steps:
        print("Could not determine how to run the application.")
        print("Please examine the repository and run manually.")
        return
    
    print("Found the following run commands from the workflow:")
    for i, cmd in enumerate(run_steps):
        print(f"{i+1}. {cmd}")
    
    # Choose a command to run
    choice = 0
    if len(run_steps) > 1:
        try:
            choice = int(input("Choose a command to run (enter the number): ")) - 1
            if choice < 0 or choice >= len(run_steps):
                choice = 0
        except ValueError:
            choice = 0
    
    command = run_steps[choice]
    
    print(f"\nRunning: {command}")
    print("=" * 50)
    
    # Execute the command in the repository directory
    process = subprocess.Popen(
        command,
        shell=True,
        cwd=repo_path
    )
    
    try:
        # Wait for the process to complete (or be interrupted)
        process.wait()
    except KeyboardInterrupt:
        print("\nProcess interrupted. Shutting down...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()

def main():
    """Main function to clone and run the repository"""
    print("Starting the clone and run process...")
    
    # Clone the repository
    repo_path = clone_repository()
    
    # Detect project type
    project_info = detect_project_type(repo_path)
    
    # Run the application
    run_application(repo_path, project_info)

if __name__ == "__main__":
    main()
